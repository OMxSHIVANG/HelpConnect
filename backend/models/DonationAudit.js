import mongoose from 'mongoose';

const donationAuditSchema = new mongoose.Schema(
    {
        donation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donation',
            required: [true, 'Audit entry must reference a donation'],
            index: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                'created',
                'accepted',
                'pickup_scheduled',
                'rescheduled',
                'picked_up',
                'received',
                'distributed',
                'completed',
                'rejected',
                'cancelled',
                'evidence_uploaded',
                'note_added',
                'agent_assigned',
                'agent_reassigned',
                'pickup_status_update',
                'agent_on_the_way',
                'agent_nearby',
                'agent_arrived',
                'donation_collected'
            ]
        },
        fromStatus: {
            type: String,
            default: ''
        },
        toStatus: {
            type: String,
            default: ''
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'performedByModel',
            required: true
        },
        performedByModel: {
            type: String,
            enum: ['User', 'PickupAgent'],
            default: 'User'
        },
        performerRole: {
            type: String,
            enum: ['user', 'donor', 'ngo', 'agent', 'admin', 'system'],
            required: true
        },
        notes: {
            type: String,
            default: '',
            trim: true
        },
        reason: {
            type: String,
            default: '',
            trim: true
        },
        evidenceImages: [{
            type: String,
            trim: true
        }],
        verificationCodeUsed: {
            type: String,
            default: ''
        },
        ipAddress: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

donationAuditSchema.index({ donation: 1, createdAt: -1 });

const DonationAudit = mongoose.model('DonationAudit', donationAuditSchema);
export default DonationAudit;
