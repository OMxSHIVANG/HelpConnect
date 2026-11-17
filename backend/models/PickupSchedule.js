import mongoose from 'mongoose';

const pickupScheduleSchema = new mongoose.Schema(
    {
        donation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donation',
            required: [true, 'Pickup schedule must reference a donation'],
            unique: true
        },
        donor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        ngo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NGO',
            required: true,
            index: true
        },
        scheduledDate: {
            type: Date,
            required: [true, 'Scheduled date is required']
        },
        timeSlot: {
            type: String,
            required: [true, 'Time slot is required'],
            enum: [
                '09:00 - 12:00 (Morning)',
                '12:00 - 15:00 (Afternoon)',
                '15:00 - 18:00 (Evening)',
                '18:00 - 21:00 (Night)',
                '09:00 AM - 12:00 PM',
                '12:00 PM - 03:00 PM',
                '03:00 PM - 06:00 PM',
                '06:00 PM - 09:00 PM'
            ]
        },
        pickupAddress: {
            type: String,
            required: [true, 'Pickup address is required'],
            trim: true
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true
        },
        contactPhone: {
            type: String,
            required: [true, 'Contact phone is required'],
            trim: true
        },
        instructions: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Instructions cannot exceed 500 characters']
        },
        status: {
            type: String,
            enum: ['pending_confirmation', 'confirmed', 'in_transit', 'completed', 'rescheduled', 'cancelled', 'missed'],
            default: 'pending_confirmation',
            index: true
        },
        rescheduleHistory: [
            {
                previousDate: Date,
                previousSlot: String,
                rescheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                reason: String,
                timestamp: { type: Date, default: Date.now }
            }
        ],
        cancellationReason: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

pickupScheduleSchema.index({ ngo: 1, scheduledDate: 1, timeSlot: 1 });
pickupScheduleSchema.index({ donor: 1, status: 1 });

const PickupSchedule = mongoose.model('PickupSchedule', pickupScheduleSchema);
export default PickupSchedule;
