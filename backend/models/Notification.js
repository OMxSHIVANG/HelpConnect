import mongoose from 'mongoose';
const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: [
        'donation_new',
        'donation_accepted',
        'donation_rejected',
        'donation_completed',
        'donation_picked_up',
        'agent_assigned',
        'agent_changed',
        'agent_on_the_way',
        'agent_nearby',
        'agent_arrived',
        'donation_collected',
        'pickup_status_updated',
        'ngo_verified',
        'ngo_rejected',
        'requirement_fulfilled',
        'general'
    ], default: 'general' },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedModel: { type: String, default: '' },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
