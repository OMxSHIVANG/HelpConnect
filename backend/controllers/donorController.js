import User from '../models/User.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import Requirement from '../models/Requirement.js';
import FavouriteNGO from '../models/FavouriteNGO.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import { calculateDistanceKm, getCoordinatesForCity } from '../utils/geoUtils.js';

export const createNotificationHelper = async (recipientId, type, title, message, relatedId = null, relatedModel = '') => {
    try {
        await Notification.create({ recipient: recipientId, type, title, message, relatedId, relatedModel });
    } catch (e) {
        console.error('Notification creation error:', e.message);
    }
};

export const getDonorStats = async (req, res) => {
    try {
        const donorId = req.user._id;
        const [total, pending, accepted, completed, rejected, picked_up, received, cancelled] = await Promise.all([
            Donation.countDocuments({ donor: donorId }),
            Donation.countDocuments({ donor: donorId, status: 'pending' }),
            Donation.countDocuments({ donor: donorId, status: 'accepted' }),
            Donation.countDocuments({ donor: donorId, status: 'completed' }),
            Donation.countDocuments({ donor: donorId, status: 'rejected' }),
            Donation.countDocuments({ donor: donorId, status: 'picked_up' }),
            Donation.countDocuments({ donor: donorId, status: 'received' }),
            Donation.countDocuments({ donor: donorId, status: 'cancelled' })
        ]);
        res.json({ total, pending, accepted, completed, rejected, picked_up, received, cancelled });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDonorDashboard = async (req, res) => {
    try {
        const donorId = req.user._id;
        const [stats, recentDonations] = await Promise.all([
            (async () => {
                const [total, pending, accepted, completed, rejected, cancelled] = await Promise.all([
                    Donation.countDocuments({ donor: donorId }),
                    Donation.countDocuments({ donor: donorId, status: 'pending' }),
                    Donation.countDocuments({ donor: donorId, status: 'accepted' }),
                    Donation.countDocuments({ donor: donorId, status: 'completed' }),
                    Donation.countDocuments({ donor: donorId, status: 'rejected' }),
                    Donation.countDocuments({ donor: donorId, status: 'cancelled' })
                ]);
                return { total, pending, accepted, completed, rejected, cancelled };
            })(),
            Donation.find({ donor: donorId })
                .populate('ngo', 'ngoName city')
                .populate('requirement', 'title category')
                .sort({ createdAt: -1 })
                .limit(5)
        ]);
        res.json({ stats, recentDonations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDonorProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateDonorProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const allowedFields = ['name', 'phone', 'location', 'username', 'gender', 'dateOfBirth', 'address', 'city', 'state', 'pincode', 'bio', 'avatar'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
            }
        });
        if (req.body.password) {
            if (req.body.password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
            user.password = req.body.password;
        }
        const updated = await user.save();
        const userObj = updated.toObject();
        delete userObj.password;
        res.json({ success: true, user: userObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getFavouriteNGOs = async (req, res) => {
    try {
        const favs = await FavouriteNGO.find({ user: req.user._id }).populate({ path: 'ngo', populate: { path: 'user', select: 'name email' } });
        res.json({ success: true, favourites: favs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleFavouriteNGO = async (req, res) => {
    try {
        const { ngoId } = req.params;
        const ngo = await NGO.findById(ngoId);
        if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });
        const existing = await FavouriteNGO.findOne({ user: req.user._id, ngo: ngoId });
        if (existing) {
            await existing.deleteOne();
            return res.json({ success: true, saved: false, message: 'NGO removed from favourites' });
        } else {
            await FavouriteNGO.create({ user: req.user._id, ngo: ngoId });
            return res.json({ success: true, saved: true, message: 'NGO added to favourites' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDonorNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(50);
        const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { isRead: true });
        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const submitReview = async (req, res) => {
    try {
        const { ngoId, rating, comment, donationId } = req.body;
        if (!ngoId || !rating) return res.status(400).json({ success: false, message: 'NGO ID and rating are required' });
        const ratingNum = Number(rating);
        if (ratingNum < 1 || ratingNum > 5) return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        const ngo = await NGO.findById(ngoId);
        if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });

        // ANTI-FRAUD: Strictly enforce that only donors with at least 1 completed verified donation may leave a review
        const hasCompletedDonation = await Donation.findOne({
            donor: req.user._id,
            ngo: ngoId,
            status: 'completed'
        });

        if (!hasCompletedDonation && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Transparency Protection: Only donors who have completed a verified donation with this NGO can submit reviews.'
            });
        }

        const review = await Review.findOneAndUpdate(
            { donor: req.user._id, ngo: ngoId },
            { rating: ratingNum, comment: comment || '', donation: donationId || hasCompletedDonation?._id || null },
            { upsert: true, new: true, runValidators: true }
        );
        res.json({ success: true, review });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Priority rank helper:
 * 1: Critical (Highest)
 * 2: High
 * 3: Medium
 * 4: Normal (Lowest)
 */
const getPriorityRank = (urgency = '') => {
    const u = String(urgency).trim().toLowerCase();
    if (u === 'critical') return 1;
    if (u === 'high') return 2;
    if (u === 'medium') return 3;
    return 4; // 'normal', 'low', or default
};

const normalizePriority = (urgency = '') => {
    const u = String(urgency).trim().toLowerCase();
    if (u === 'critical') return 'Critical';
    if (u === 'high') return 'High';
    if (u === 'medium') return 'Medium';
    return 'Normal';
};

// @desc    Get smart donation requirements from nearby NGOs (within 100 KM radius)
// @route   GET /api/donor/urgent-nearby
// @access  Private (Donor)
export const getUrgentNearbyRequirements = async (req, res) => {
    try {
        let { lat, lng, radius = 100, city } = req.query;
        const radiusKm = Math.max(1, Math.min(1000, Number(radius) || 100));

        let donorLat = lat !== undefined && lat !== null && lat !== '' ? Number(lat) : null;
        let donorLng = lng !== undefined && lng !== null && lng !== '' ? Number(lng) : null;

        // If coordinates not passed directly, attempt fallback from query city or donor's user profile
        if (donorLat === null || donorLng === null || isNaN(donorLat) || isNaN(donorLng)) {
            const donorUser = await User.findById(req.user._id);
            const lookupCity = city || donorUser?.city || donorUser?.location || '';
            if (lookupCity) {
                const resolved = getCoordinatesForCity(lookupCity, donorUser?.address);
                if (resolved) {
                    donorLng = resolved[0];
                    donorLat = resolved[1];
                }
            }
        }

        // Fetch verified and active NGOs
        const ngos = await NGO.find({ isVerified: true, isActive: true })
            .select('ngoName registrationNumber phone address city state logo location website description');

        const now = new Date();
        const nearbyNgosMap = new Map();
        const nearbyNgoList = [];

        for (const ngo of ngos) {
            let ngoLng = ngo.location?.coordinates?.[0];
            let ngoLat = ngo.location?.coordinates?.[1];

            // If coordinates not set or at [0, 0], geocode from city / address
            if (!ngoLng && !ngoLat || (ngoLng === 0 && ngoLat === 0)) {
                const resolved = getCoordinatesForCity(ngo.city, ngo.address);
                if (resolved) {
                    const [resolvedLng, resolvedLat] = resolved;
                    ngoLng = resolvedLng;
                    ngoLat = resolvedLat;
                    // Asynchronously persist to database so geospatial indexing works
                    NGO.findByIdAndUpdate(ngo._id, {
                        location: { type: 'Point', coordinates: [resolvedLng, resolvedLat] }
                    }).exec().catch(() => {});
                }
            }

            const distanceKm = calculateDistanceKm(donorLat, donorLng, ngoLat, ngoLng);

            // Filter within the given radius (default 100 KM)
            if (distanceKm !== null && distanceKm <= radiusKm) {
                const ngoData = {
                    _id: ngo._id,
                    ngoName: ngo.ngoName,
                    registrationNumber: ngo.registrationNumber,
                    phone: ngo.phone,
                    address: ngo.address,
                    city: ngo.city,
                    state: ngo.state,
                    logo: ngo.logo || '',
                    website: ngo.website || '',
                    description: ngo.description || '',
                    coordinates: [ngoLng, ngoLat],
                    latitude: ngoLat,
                    longitude: ngoLng,
                    distanceKm,
                    activeRequirements: [],
                    highestPriority: 'Normal',
                    highestPriorityRank: 4
                };
                nearbyNgosMap.set(ngo._id.toString(), ngoData);
                nearbyNgoList.push(ngoData);
            }
        }

        if (nearbyNgoList.length === 0) {
            return res.json({
                success: true,
                donorLocation: { latitude: donorLat, longitude: donorLng, radiusKm },
                totalRequirements: 0,
                requirements: [],
                nearbyNGOs: []
            });
        }

        const nearbyNgoIds = Array.from(nearbyNgosMap.keys());

        // Find active requirements for nearby NGOs
        // Must be: status = 'active', remainingQuantity > 0, and not expired
        const requirements = await Requirement.find({
            ngo: { $in: nearbyNgoIds },
            status: 'active',
            remainingQuantity: { $gt: 0 },
            $or: [
                { deadline: null },
                { deadline: { $exists: false } },
                { deadline: { $gte: now } }
            ]
        }).populate('ngo', 'ngoName phone city address logo');

        const formattedRequirements = [];

        for (const reqItem of requirements) {
            const ngoIdStr = reqItem.ngo?._id ? reqItem.ngo._id.toString() : reqItem.ngo.toString();
            const ngoData = nearbyNgosMap.get(ngoIdStr);
            if (!ngoData) continue;

            const priorityBadge = normalizePriority(reqItem.urgency);
            const priorityRank = getPriorityRank(reqItem.urgency);
            const distanceKm = ngoData.distanceKm;

            const quantity = reqItem.quantity || 1;
            const remainingQuantity = Math.max(0, reqItem.remainingQuantity !== undefined ? reqItem.remainingQuantity : quantity);
            const alreadyReceived = Math.max(0, quantity - remainingQuantity);
            const shortagePercentage = Math.min(100, Math.max(0, Math.round((remainingQuantity / quantity) * 100)));

            const deadlineTime = reqItem.deadline ? new Date(reqItem.deadline).getTime() : Number.MAX_SAFE_INTEGER;

            const formatted = {
                _id: reqItem._id,
                title: reqItem.title,
                category: reqItem.category || 'General',
                description: reqItem.description || '',
                unit: reqItem.unit || 'pieces',
                image: reqItem.image || '',
                urgency: reqItem.urgency || 'Medium',
                priorityBadge,
                priorityRank,
                distanceKm,
                quantity,
                receivedQuantity: alreadyReceived,
                remainingQuantity,
                shortagePercentage,
                deadline: reqItem.deadline || null,
                deadlineTime,
                city: reqItem.city || ngoData.city,
                status: reqItem.status,
                createdAt: reqItem.createdAt,
                ngo: {
                    _id: ngoData._id,
                    ngoName: ngoData.ngoName,
                    logo: ngoData.logo,
                    phone: ngoData.phone,
                    address: ngoData.address,
                    city: ngoData.city,
                    state: ngoData.state,
                    website: ngoData.website,
                    description: ngoData.description,
                    coordinates: ngoData.coordinates,
                    distanceKm: ngoData.distanceKm
                }
            };

            formattedRequirements.push(formatted);

            // Record in NGO summary for interactive map
            ngoData.activeRequirements.push({
                _id: formatted._id,
                title: formatted.title,
                category: formatted.category,
                priorityBadge: formatted.priorityBadge,
                remainingQuantity: formatted.remainingQuantity,
                unit: formatted.unit,
                deadline: formatted.deadline
            });

            if (priorityRank < ngoData.highestPriorityRank) {
                ngoData.highestPriorityRank = priorityRank;
                ngoData.highestPriority = priorityBadge;
            }
        }

        // Apply Smart Sorting Algorithm:
        // 1. Priority (Critical > High > Medium > Normal)
        // 2. Distance (Nearest NGO first)
        // 3. For equal priority and distance, earliest deadline first
        formattedRequirements.sort((a, b) => {
            // First: Priority
            if (a.priorityRank !== b.priorityRank) {
                return a.priorityRank - b.priorityRank;
            }
            // Second: Distance
            if (a.distanceKm !== b.distanceKm) {
                return a.distanceKm - b.distanceKm;
            }
            // Third: Earliest Deadline
            if (a.deadlineTime !== b.deadlineTime) {
                return a.deadlineTime - b.deadlineTime;
            }
            // Fallback: Newest first
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Filter out NGOs that have no active requirements for the map, or keep them with indicator
        const activeNearbyNGOs = nearbyNgoList.filter(n => n.activeRequirements.length > 0);

        res.json({
            success: true,
            donorLocation: {
                latitude: donorLat,
                longitude: donorLng,
                radiusKm
            },
            totalRequirements: formattedRequirements.length,
            requirements: formattedRequirements,
            nearbyNGOs: activeNearbyNGOs
        });
    } catch (error) {
        console.error('Urgent nearby requirements error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * FEATURE 1: AI-POWERED SMART DONATION MATCHING ENGINE
 * Evaluates donor available items against active NGO requirements with transparent scoring.
 * Category & subcategory (0-40) + Quantity coverage (0-25) + Urgency (0-20) + Proximity (0-15)
 */
export const getSmartDonationRecommendations = async (req, res) => {
    try {
        const { items = [], lat, lng, maxDistance = 100 } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.json({
                success: true,
                totalMatches: 0,
                recommendations: [],
                message: 'No items provided for smart matching.'
            });
        }

        const donorUser = await User.findById(req.user._id);

        let donorLat = lat !== undefined && lat !== null && lat !== '' ? Number(lat) : null;
        let donorLng = lng !== undefined && lng !== null && lng !== '' ? Number(lng) : null;

        if (donorLat === null || donorLng === null || isNaN(donorLat) || isNaN(donorLng)) {
            const lookupCity = donorUser?.city || donorUser?.location || '';
            if (lookupCity) {
                const resolved = getCoordinatesForCity(lookupCity, donorUser?.address);
                if (resolved) {
                    donorLng = resolved[0];
                    donorLat = resolved[1];
                }
            }
        }

        const radiusKm = Math.max(1, Math.min(1000, Number(maxDistance) || 100));
        const now = new Date();

        // 1. Fetch active, unfulfilled, non-expired requirements with verified NGOs
        const requirements = await Requirement.find({
            status: 'active',
            remainingQuantity: { $gt: 0 },
            $or: [
                { deadline: null },
                { deadline: { $exists: false } },
                { deadline: { $gte: now } }
            ]
        }).populate('ngo', 'ngoName phone city address logo location isVerified website');

        if (!requirements || requirements.length === 0) {
            return res.json({ success: true, recommendations: [], totalMatches: 0 });
        }

        const recommendations = [];

        for (const reqItem of requirements) {
            const ngo = reqItem.ngo;
            if (!ngo || !ngo.isVerified) continue;

            const ngoCoords = ngo.city ? getCoordinatesForCity(ngo.city) : null;
            const ngoLng = ngo.location?.coordinates?.[0] ?? ngoCoords?.[0] ?? null;
            const ngoLat = ngo.location?.coordinates?.[1] ?? ngoCoords?.[1] ?? null;
            const distanceKm = calculateDistanceKm(donorLat, donorLng, ngoLat, ngoLng);

            // If coordinates resolved and exceeds radius, skip
            if (distanceKm !== null && distanceKm > radiusKm) continue;

            let highestMatchScore = 0;
            let matchedDonorItem = null;
            let matchBreakdown = { categoryScore: 0, quantityScore: 0, urgencyScore: 0, proximityScore: 0, bonus: 0 };
            let reason = '';

            const reqCat = String(reqItem.category || '').toLowerCase();
            const reqTitle = String(reqItem.title || '').toLowerCase();
            const reqDesc = String(reqItem.description || '').toLowerCase();

            // Evaluate against all items donor has available
            if (Array.isArray(items) && items.length > 0) {
                for (const dItem of items) {
                    const itemCat = String(dItem.category || '').toLowerCase();
                    const itemName = String(dItem.item || dItem.name || '').toLowerCase();
                    const itemQty = Number(dItem.quantity) || 1;

                    let catScore = 0;
                    if (reqCat.includes(itemCat) || itemCat.includes(reqCat) || reqCat === 'other' || itemCat === 'other') {
                        catScore = 30;
                    }
                    if (itemName && (reqTitle.includes(itemName) || reqDesc.includes(itemName) || itemName.includes(reqTitle.slice(0, 8)))) {
                        catScore += 10;
                    } else if (dItem.subCategory && reqDesc.includes(String(dItem.subCategory).toLowerCase())) {
                        catScore += 10;
                    }

                    if (catScore === 0) continue; // Not a category match

                    // Quantity coverage (0-25)
                    const coverageRatio = Math.min(1, itemQty / reqItem.remainingQuantity);
                    const qtyScore = Math.round(coverageRatio * 25);

                    // Urgency score (0-20)
                    const urgency = reqItem.urgency || 'Medium';
                    const urgencyScore = urgency === 'Critical' ? 20 : urgency === 'High' ? 15 : urgency === 'Medium' ? 10 : 5;

                    // Proximity score (0-15)
                    let proxScore = 15;
                    if (distanceKm > 60) proxScore = 5;
                    else if (distanceKm > 30) proxScore = 9;
                    else if (distanceKm > 10) proxScore = 12;

                    // Deadline bonus (+5 if within 5 days)
                    let deadlineBonus = 0;
                    if (reqItem.deadline) {
                        const daysRemaining = (new Date(reqItem.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                        if (daysRemaining <= 5 && daysRemaining >= 0) deadlineBonus = 5;
                    }

                    const totalScore = Math.min(100, catScore + qtyScore + urgencyScore + proxScore + deadlineBonus);

                    if (totalScore > highestMatchScore) {
                        highestMatchScore = totalScore;
                        matchedDonorItem = dItem;
                        matchBreakdown = {
                            categoryScore: catScore,
                            quantityScore: qtyScore,
                            urgencyScore,
                            proximityScore: proxScore,
                            bonus: deadlineBonus
                        };

                        const percentCovered = Math.min(100, Math.round((itemQty / reqItem.remainingQuantity) * 100));
                        reason = `${totalScore}% Match: You have ${itemQty} ${dItem.item || dItem.category} which covers ${percentCovered}% of this ${urgency} need at ${ngo.ngoName} (${distanceKm} KM away)`;
                        if (deadlineBonus > 0) {
                            reason += ` before upcoming deadline.`;
                        } else {
                            reason += `.`;
                        }
                    }
                }
            } else {
                // If donor provided no specific item input, generate general smart compatibility score
                const urgency = reqItem.urgency || 'Medium';
                const urgencyScore = urgency === 'Critical' ? 20 : urgency === 'High' ? 15 : urgency === 'Medium' ? 10 : 5;
                let proxScore = 15;
                if (distanceKm > 60) proxScore = 5;
                else if (distanceKm > 30) proxScore = 9;
                else if (distanceKm > 10) proxScore = 12;
                highestMatchScore = 50 + urgencyScore + proxScore;
                reason = `Recommended based on ${urgency} urgency priority and proximity (${distanceKm} KM from your location).`;
            }

            if (highestMatchScore >= 40) {
                recommendations.push({
                    _id: reqItem._id,
                    title: reqItem.title,
                    category: reqItem.category,
                    description: reqItem.description,
                    quantity: reqItem.quantity,
                    remainingQuantity: reqItem.remainingQuantity,
                    unit: reqItem.unit || 'items',
                    urgency: reqItem.urgency || 'Medium',
                    deadline: reqItem.deadline,
                    distanceKm,
                    matchPercentage: highestMatchScore,
                    matchBreakdown,
                    matchedDonorItem,
                    recommendationReason: reason,
                    ngo: {
                        _id: ngo._id,
                        ngoName: ngo.ngoName,
                        city: ngo.city,
                        address: ngo.address,
                        phone: ngo.phone,
                        logo: ngo.logo,
                        isVerified: ngo.isVerified
                    }
                });
            }
        }

        // Sort descending by matchPercentage, then nearest distance
        recommendations.sort((a, b) => {
            if (b.matchPercentage !== a.matchPercentage) {
                return b.matchPercentage - a.matchPercentage;
            }
            return a.distanceKm - b.distanceKm;
        });

        // Add alternative matching suggestions
        const enriched = recommendations.map((rec, idx) => {
            const alternatives = recommendations
                .filter(other => other._id.toString() !== rec._id.toString() && other.category === rec.category)
                .slice(0, 2)
                .map(alt => ({
                    _id: alt._id,
                    ngoName: alt.ngo.ngoName,
                    distanceKm: alt.distanceKm,
                    remainingQuantity: alt.remainingQuantity,
                    matchPercentage: alt.matchPercentage
                }));
            return { ...rec, rank: idx + 1, alternativeMatches: alternatives };
        });

        res.json({
            success: true,
            totalMatches: enriched.length,
            recommendations: enriched,
            donorCoordinates: { latitude: donorLat, longitude: donorLng, radiusKm }
        });
    } catch (error) {
        console.error('Smart recommendation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * FEATURE 2: DONOR IMPACT PASSPORT
 * Official verified donor metrics, badges, certificates and shareable profile.
 */
export const getDonorImpactPassport = async (req, res) => {
    try {
        const donorId = req.user._id;
        const user = await User.findById(donorId).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // STRICT REQUIREMENT: Only count verified and completed donations
        const completedDonations = await Donation.find({ donor: donorId, status: 'completed' })
            .populate('ngo', 'ngoName city logo registrationNumber')
            .populate('requirement', 'title category unit')
            .populate('campaign', 'title category')
            .sort({ updatedAt: -1 });

        const totalCompletedCount = completedDonations.length;
        let totalItemsDonated = 0;
        const supportedNgoIds = new Set();
        const supportedCampaignIds = new Set();
        const categoryMap = {};
        const monthlyStats = {};
        const yearlyStats = {};

        completedDonations.forEach(don => {
            totalItemsDonated += don.quantity;
            if (don.ngo?._id) supportedNgoIds.add(don.ngo._id.toString());
            if (don.campaign?._id) supportedCampaignIds.add(don.campaign._id.toString());

            const cat = don.requirement?.category || 'General';
            categoryMap[cat] = (categoryMap[cat] || 0) + don.quantity;

            const date = don.updatedAt || don.createdAt;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const yearKey = `${date.getFullYear()}`;

            monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + don.quantity;
            yearlyStats[yearKey] = (yearlyStats[yearKey] || 0) + don.quantity;
        });

        // Achievements & Badges Engine
        const badges = [
            {
                id: 'FIRST_IMPACT',
                title: 'First Impact',
                description: 'Completed your very first verified donation on HelpConnect.',
                icon: '🌱',
                category: 'Milestone',
                earned: totalCompletedCount >= 1,
                earnedAt: completedDonations[completedDonations.length - 1]?.updatedAt || null
            },
            {
                id: 'EDUCATION_CHAMPION',
                title: 'Education Champion',
                description: 'Contributed educational books, school supplies, or notebooks to children.',
                icon: '📚',
                category: 'Cause',
                earned: (categoryMap['Books'] || 0) > 0 || (categoryMap['School Supplies'] || 0) > 0,
                earnedAt: completedDonations.find(d => ['Books', 'School Supplies'].includes(d.requirement?.category))?.updatedAt || null
            },
            {
                id: 'WARMTH_PROVIDER',
                title: 'Winter Warmth Provider',
                description: 'Donated warm jackets, sweaters or blankets to shelter residents.',
                icon: '🧥',
                category: 'Cause',
                earned: (categoryMap['Clothes'] || 0) > 0,
                earnedAt: completedDonations.find(d => d.requirement?.category === 'Clothes')?.updatedAt || null
            },
            {
                id: 'HUNGER_HERO',
                title: 'Hunger Relief Hero',
                description: 'Contributed ration packs or nutritional food supplies.',
                icon: '🍲',
                category: 'Cause',
                earned: (categoryMap['Food'] || 0) > 0,
                earnedAt: completedDonations.find(d => d.requirement?.category === 'Food')?.updatedAt || null
            },
            {
                id: 'HEALTH_DEFENDER',
                title: 'Healthcare Defender',
                description: 'Provided essential medicines or first-aid supplies.',
                icon: '🩹',
                category: 'Cause',
                earned: (categoryMap['Medicine'] || 0) > 0,
                earnedAt: completedDonations.find(d => d.requirement?.category === 'Medicine')?.updatedAt || null
            },
            {
                id: 'COMMUNITY_STAR',
                title: 'Community Star',
                description: 'Completed 5 or more verified donation handovers to partner NGOs.',
                icon: '⭐',
                category: 'Honor',
                earned: totalCompletedCount >= 5,
                earnedAt: completedDonations[4]?.updatedAt || null
            },
            {
                id: 'CONSISTENT_GIVER',
                title: 'Consistent Giver',
                description: 'Contributed across 3 or more distinct calendar months.',
                icon: '🏆',
                category: 'Consistency',
                earned: Object.keys(monthlyStats).length >= 3,
                earnedAt: completedDonations[0]?.updatedAt || null
            }
        ];

        // Format timeline
        const timeline = completedDonations.map(don => ({
            id: don._id,
            date: don.updatedAt || don.createdAt,
            ngoName: don.ngo?.ngoName || 'Partner NGO',
            requirementTitle: don.requirement?.title || 'Material Donation',
            category: don.requirement?.category || 'General',
            quantity: don.quantity,
            unit: don.requirement?.unit || 'items',
            verificationCode: don.verificationCode,
            evidenceImages: don.evidenceImages || [],
            distributionDate: don.distributionDate
        }));

        // Certificates
        const certificates = [];
        if (totalCompletedCount >= 1) {
            certificates.push({
                certificateId: `CERT-HC-${donorId.toString().substring(18, 24).toUpperCase()}-FOUNDATION`,
                title: 'Certificate of Social Impact',
                issuedTo: user.name,
                impactSummary: `${totalItemsDonated} items donated across ${supportedNgoIds.size} NGOs`,
                issueDate: completedDonations[0]?.updatedAt || new Date(),
                signatory: 'HelpConnect Platform Verification Board'
            });
        }

        res.json({
            success: true,
            passport: {
                donor: {
                    id: user._id,
                    name: user.name,
                    avatar: user.avatar,
                    city: user.city || user.location || '',
                    memberSince: user.createdAt,
                    privacy: user.impactPrivacy || { isPublic: true, showStats: true, showBadges: true, showTimeline: true }
                },
                metrics: {
                    totalCompletedDonations: totalCompletedCount,
                    totalItemsDonated,
                    totalNgosSupported: supportedNgoIds.size,
                    totalCampaignsSupported: supportedCampaignIds.size,
                    categoriesBreakdown: categoryMap,
                    monthlyDistribution: monthlyStats,
                    yearlyDistribution: yearlyStats
                },
                badges,
                timeline,
                certificates
            }
        });
    } catch (error) {
        console.error('Impact passport error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update donor impact passport privacy settings
// @route   PUT /api/donor/impact-passport/privacy
// @access  Private (Donor)
export const updateImpactPrivacy = async (req, res) => {
    try {
        const { isPublic, showStats, showBadges, showTimeline } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.impactPrivacy = {
            isPublic: isPublic !== undefined ? Boolean(isPublic) : user.impactPrivacy?.isPublic ?? true,
            showStats: showStats !== undefined ? Boolean(showStats) : user.impactPrivacy?.showStats ?? true,
            showBadges: showBadges !== undefined ? Boolean(showBadges) : user.impactPrivacy?.showBadges ?? true,
            showTimeline: showTimeline !== undefined ? Boolean(showTimeline) : user.impactPrivacy?.showTimeline ?? true
        };

        await user.save();
        res.json({ success: true, message: 'Impact passport privacy settings updated', privacy: user.impactPrivacy });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get public shareable impact passport for a donor
// @route   GET /api/donor/impact-passport/public/:donorId
// @access  Public
export const getPublicImpactProfile = async (req, res) => {
    try {
        const { donorId } = req.params;
        const user = await User.findById(donorId).select('name avatar createdAt city impactPrivacy');
        if (!user) return res.status(404).json({ success: false, message: 'Donor profile not found' });

        const privacy = user.impactPrivacy || { isPublic: true, showStats: true, showBadges: true, showTimeline: true };
        if (!privacy.isPublic) {
            return res.status(403).json({ success: false, message: 'This donor has made their impact passport private.' });
        }

        const completedDonations = await Donation.find({ donor: donorId, status: 'completed' })
            .populate('ngo', 'ngoName city logo')
            .populate('requirement', 'title category unit')
            .sort({ updatedAt: -1 });

        const totalCompleted = completedDonations.length;
        let totalItems = 0;
        const ngos = new Set();
        const categoryMap = {};

        completedDonations.forEach(d => {
            totalItems += d.quantity;
            if (d.ngo?._id) ngos.add(d.ngo._id.toString());
            const cat = d.requirement?.category || 'General';
            categoryMap[cat] = (categoryMap[cat] || 0) + d.quantity;
        });

        res.json({
            success: true,
            donor: {
                id: user._id,
                name: user.name,
                avatar: user.avatar,
                city: user.city || '',
                memberSince: user.createdAt
            },
            metrics: privacy.showStats ? {
                totalCompletedDonations: totalCompleted,
                totalItemsDonated: totalItems,
                totalNgosSupported: ngos.size,
                categoriesBreakdown: categoryMap
            } : null,
            badges: privacy.showBadges ? [
                { title: 'First Impact', icon: '🌱', earned: totalCompleted >= 1 },
                { title: 'Education Champion', icon: '📚', earned: (categoryMap['Books'] || 0) > 0 },
                { title: 'Winter Warmth', icon: '🧥', earned: (categoryMap['Clothes'] || 0) > 0 },
                { title: 'Hunger Relief', icon: '🍲', earned: (categoryMap['Food'] || 0) > 0 },
                { title: 'Community Star', icon: '⭐', earned: totalCompleted >= 5 }
            ].filter(b => b.earned) : [],
            timeline: privacy.showTimeline ? completedDonations.slice(0, 10).map(d => ({
                id: d._id,
                date: d.updatedAt,
                ngoName: d.ngo?.ngoName,
                category: d.requirement?.category,
                quantity: d.quantity,
                unit: d.requirement?.unit || 'items'
            })) : []
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
