import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Sender is required']
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Receiver is required']
        },
        donation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donation'
        },
        text: {
            type: String,
            required: [true, 'Message text is required'],
            trim: true,
            maxlength: [2000, 'Message cannot exceed 2000 characters']
        },
        read: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, read: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
