import mongoose from 'mongoose';
const reviewSchema = new mongoose.Schema({
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true },
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', default: null },
    rating: { type: Number, required: true, min: [1,'Rating must be at least 1'], max: [5,'Rating cannot exceed 5'] },
    comment: { type: String, default: '', trim: true, maxlength: [500,'Comment cannot exceed 500 chars'] }
}, { timestamps: true });
reviewSchema.index({ donor: 1, ngo: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);
export default Review;
