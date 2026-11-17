import PickupSchedule from '../models/PickupSchedule.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import DonationAudit from '../models/DonationAudit.js';
import { getCoordinatesForCity } from '../utils/geoUtils.js';

// @desc    Schedule or request a pickup for an accepted donation
// @route   POST /api/pickups
// @access  Private (Donor / NGO / Admin)
export const schedulePickup = async (req, res) => {
    try {
        const { donationId, scheduledDate, timeSlot, pickupAddress, city, contactPhone, instructions } = req.body;

        if (!donationId || !scheduledDate || !timeSlot || !pickupAddress || !contactPhone) {
            return res.status(400).json({ success: false, message: 'Missing required pickup details (donation, date, slot, address, phone)' });
        }

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // Authorization: Donor owner or recipient NGO or admin
        const ngo = await NGO.findOne({ user: req.user._id });
        const donNgoId = (donation.ngo?._id || donation.ngo)?.toString();
        const isRecipientNGO = ngo && donNgoId === ngo._id.toString();
        const isOwnerDonor = donation.donor.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isRecipientNGO && !isOwnerDonor && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to schedule pickup for this donation' });
        }

        const parsedDate = new Date(scheduledDate);
        if (isNaN(parsedDate.getTime()) || parsedDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
            return res.status(400).json({ success: false, message: 'Scheduled pickup date must be today or in the future' });
        }

        // Scheduling conflict prevention: check if NGO already has excessive bookings (e.g. max 5 pickups) in the exact same time slot on that day
        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const slotBookingsCount = await PickupSchedule.countDocuments({
            ngo: donation.ngo,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay },
            timeSlot,
            status: { $in: ['pending_confirmation', 'confirmed', 'in_transit'] }
        });

        if (slotBookingsCount >= 6) {
            return res.status(409).json({
                success: false,
                message: `Scheduling conflict: The selected time slot (${timeSlot}) on ${parsedDate.toDateString()} is fully booked. Please choose another slot or date.`
            });
        }

        // Create or update existing schedule
        const pickup = await PickupSchedule.findOneAndUpdate(
            { donation: donation._id },
            {
                donation: donation._id,
                donor: donation.donor,
                ngo: donation.ngo,
                scheduledDate: parsedDate,
                timeSlot,
                pickupAddress: pickupAddress.trim(),
                city: city ? city.trim() : donation.city,
                contactPhone: contactPhone.trim(),
                instructions: instructions ? instructions.trim() : '',
                status: isRecipientNGO ? 'confirmed' : 'pending_confirmation'
            },
            { upsert: true, new: true, runValidators: true }
        );

        // Update donation status to pickup_scheduled if currently accepted
        if (donation.status === 'accepted') {
            donation.status = 'pickup_scheduled';
            donation.scheduledPickupDate = parsedDate;
            await donation.save();

            await DonationAudit.create({
                donation: donation._id,
                action: 'pickup_scheduled',
                fromStatus: 'accepted',
                toStatus: 'pickup_scheduled',
                performedBy: req.user._id,
                performerRole: req.user.role,
                notes: `Pickup scheduled for ${parsedDate.toLocaleDateString()} (${timeSlot})`
            });
        }

        res.status(201).json({ success: true, pickup });
    } catch (error) {
        console.error('Schedule pickup error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get pickup schedule for a donation
// @route   GET /api/pickups/donation/:donationId
// @access  Private (Donor / NGO / Admin)
export const getPickupScheduleByDonation = async (req, res) => {
    try {
        const pickup = await PickupSchedule.findOne({ donation: req.params.donationId })
            .populate('ngo', 'ngoName phone city address')
            .populate('donor', 'name phone email');

        if (!pickup) {
            return res.status(404).json({ success: false, message: 'No pickup scheduled for this donation' });
        }

        res.json({ success: true, pickup });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all pickups for NGO (pickup calendar & grouped by area)
// @route   GET /api/pickups/ngo-calendar
// @access  Private (NGO / Admin)
export const getNgoPickups = async (req, res) => {
    try {
        let ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo && req.user.role === 'admin') {
            if (req.query.ngoId) {
                ngo = await NGO.findById(req.query.ngoId);
            } else {
                ngo = await NGO.findOne();
            }
        }
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        // Auto-sync any accepted, pickup_scheduled, or picked_up donations for this NGO into PickupSchedule
        const activeDonations = await Donation.find({
            ngo: ngo._id,
            status: { $in: ['accepted', 'pickup_scheduled', 'picked_up'] }
        }).populate('donor', 'name phone email location address city');

        for (const don of activeDonations) {
            const exists = await PickupSchedule.findOne({ donation: don._id });
            if (!exists) {
                const targetDate = don.scheduledPickupDate || new Date(Date.now() + 24 * 60 * 60 * 1000);
                await PickupSchedule.create({
                    donation: don._id,
                    donor: don.donor?._id || don.donor,
                    ngo: ngo._id,
                    scheduledDate: targetDate,
                    timeSlot: '09:00 - 12:00 (Morning)',
                    pickupAddress: don.pickupAddress || don.donor?.address || `${don.city || ngo.city} Pickup Spot`,
                    city: don.city || ngo.city || 'Bareilly',
                    contactPhone: don.donor?.phone || '9876543210',
                    instructions: don.description || '',
                    status: don.status === 'picked_up' ? 'completed' : 'confirmed'
                });
            }
        }

        const { date, status } = req.query;
        const query = { ngo: ngo._id };
        if (status && status !== 'all') query.status = status;
        if (date) {
            const dateStr = String(date).split('T')[0];
            const [y, m, d] = dateStr.split('-').map(Number);
            const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
            const dayEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
            query.scheduledDate = { $gte: dayStart, $lte: dayEnd };
        }

        const pickups = await PickupSchedule.find(query)
            .populate('donor', 'name phone email location')
            .populate('donation', 'quantity description requirement status verificationCode')
            .sort({ scheduledDate: 1, timeSlot: 1 });

        // Group pickups by city/area for logistics optimization and enrich with GPS coordinates
        const areaGroups = {};
        const enrichedPickups = pickups.map(p => {
            const pObj = p.toObject();
            let coords = null;
            if (p.pickupLocation?.latitude != null && p.pickupLocation?.longitude != null) {
                coords = [p.pickupLocation.longitude, p.pickupLocation.latitude];
            } else {
                coords = getCoordinatesForCity(p.city, p.pickupAddress);
            }
            pObj.coordinates = coords; // [lng, lat]
            pObj.latitude = coords ? coords[1] : null;
            pObj.longitude = coords ? coords[0] : null;

            const area = p.city || 'Central';
            if (!areaGroups[area]) areaGroups[area] = [];
            areaGroups[area].push(pObj);
            return pObj;
        });

        const hasValidNgoCoords = Array.isArray(ngo.location?.coordinates) &&
            ngo.location.coordinates.length === 2 &&
            (ngo.location.coordinates[0] !== 0 || ngo.location.coordinates[1] !== 0);

        const ngoCoords = hasValidNgoCoords
            ? ngo.location.coordinates
            : getCoordinatesForCity(ngo.city, ngo.address);

        res.json({
            success: true,
            count: enrichedPickups.length,
            pickups: enrichedPickups,
            areaGroups,
            ngoLocation: {
                ngoName: ngo.ngoName,
                address: ngo.address,
                city: ngo.city,
                coordinates: ngoCoords,
                latitude: ngoCoords ? ngoCoords[1] : null,
                longitude: ngoCoords ? ngoCoords[0] : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reschedule a pickup
// @route   PUT /api/pickups/:id/reschedule
// @access  Private (Donor / NGO / Admin)
export const reschedulePickup = async (req, res) => {
    try {
        const { newDate, newTimeSlot, reason } = req.body;
        const pickup = await PickupSchedule.findById(req.params.id);

        if (!pickup) {
            return res.status(404).json({ success: false, message: 'Pickup schedule not found' });
        }

        const ngo = await NGO.findOne({ user: req.user._id });
        const isOwnerDonor = pickup.donor.toString() === req.user._id.toString();
        const isManagingNGO = ngo && pickup.ngo.toString() === ngo._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwnerDonor && !isManagingNGO && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to reschedule this pickup appointment' });
        }

        const parsedNewDate = new Date(newDate);
        if (isNaN(parsedNewDate.getTime()) || parsedNewDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
            return res.status(400).json({ success: false, message: 'New date must be in the future' });
        }

        // Record reschedule history
        pickup.rescheduleHistory.push({
            previousDate: pickup.scheduledDate,
            previousSlot: pickup.timeSlot,
            rescheduledBy: req.user._id,
            reason: reason ? reason.trim() : 'Rescheduled by user'
        });

        pickup.scheduledDate = parsedNewDate;
        if (newTimeSlot) pickup.timeSlot = newTimeSlot;
        pickup.status = 'rescheduled';

        const updated = await pickup.save();

        await DonationAudit.create({
            donation: pickup.donation,
            action: 'rescheduled',
            fromStatus: 'pickup_scheduled',
            toStatus: 'pickup_scheduled',
            performedBy: req.user._id,
            performerRole: req.user.role,
            notes: `Pickup rescheduled to ${parsedNewDate.toLocaleDateString()} (${newTimeSlot || pickup.timeSlot}). Reason: ${reason || 'N/A'}`
        });

        res.json({ success: true, message: 'Pickup rescheduled successfully', pickup: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update pickup status (confirmed, in_transit, completed, missed, cancelled)
// @route   PUT /api/pickups/:id/status
// @access  Private (NGO / Admin)
export const updatePickupStatus = async (req, res) => {
    try {
        const { status, cancellationReason } = req.body;
        const pickup = await PickupSchedule.findById(req.params.id);

        if (!pickup) {
            return res.status(404).json({ success: false, message: 'Pickup schedule not found' });
        }

        const ngo = await NGO.findOne({ user: req.user._id });
        const isOwnerDonor = pickup.donor.toString() === req.user._id.toString();
        const isManagingNGO = ngo && pickup.ngo.toString() === ngo._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isManagingNGO && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to update status for this pickup' });
        }

        const allowed = ['confirmed', 'in_transit', 'completed', 'missed', 'cancelled'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid pickup status '${status}'` });
        }

        pickup.status = status;
        if (cancellationReason) pickup.cancellationReason = cancellationReason.trim();
        const updated = await pickup.save();

        // If pickup is marked completed, also transition donation to picked_up
        if (status === 'completed') {
            await Donation.findByIdAndUpdate(pickup.donation, { status: 'picked_up' });
            await DonationAudit.create({
                donation: pickup.donation,
                action: 'picked_up',
                fromStatus: 'pickup_scheduled',
                toStatus: 'picked_up',
                performedBy: req.user._id,
                performerRole: req.user.role,
                notes: 'Physical pickup completed by NGO collection agent'
            });
        }

        res.json({ success: true, pickup: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
