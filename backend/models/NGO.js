import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'NGO profile must be linked to a user account'],
            unique: true
        },
        ngoName: {
            type: String,
            required: [true, 'NGO Name is required'],
            trim: true,
            maxlength: [150, 'NGO name cannot exceed 150 characters']
        },
        registrationNumber: {
            type: String,
            required: [true, 'Registration Number is required'],
            unique: true,
            trim: true,
            uppercase: true
        },
        phone: {
            type: String,
            default: '',
            trim: true
        },
        address: {
            type: String,
            required: [true, 'Office address is required'],
            trim: true
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true
        },
        state: {
            type: String,
            default: '',
            trim: true
        },
        description: {
            type: String,
            default: '',
            trim: true
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        },
        logo: { type: String, default: '' },
        ngoType: { type: String, default: '', trim: true },
        establishedYear: { type: Number, default: null },
        website: { type: String, default: '', trim: true },
        mission: { type: String, default: '', trim: true },
        vision: { type: String, default: '', trim: true },
        workingAreas: [{ type: String, trim: true }],
        verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
        verificationNote: { type: String, default: '' },
        lastVerifiedAt: { type: Date, default: Date.now },
        transparencyScore: { type: Number, default: 75, min: 0, max: 100 },
        evidenceSubmissionRate: { type: Number, default: 0 },
        fulfilledRequirementsCount: { type: Number, default: 0 },
        completedDonationsCount: { type: Number, default: 0 },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0]
            },
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null },
            accuracy: { type: Number, default: null },
            formattedAddress: { type: String, default: '', trim: true },
            verificationStatus: {
                type: String,
                enum: ['unverified', 'verified', 'geocoded', 'manual_map_selected', 'gps_verified'],
                default: 'unverified'
            },
            lastUpdatedAt: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true
    }
);

ngoSchema.pre('validate', function () {
    if (this.location) {
        if (this.location.latitude != null && this.location.longitude != null) {
            this.location.coordinates = [Number(this.location.longitude), Number(this.location.latitude)];
        } else if (Array.isArray(this.location.coordinates) && this.location.coordinates.length === 2 && (this.location.coordinates[0] !== 0 || this.location.coordinates[1] !== 0)) {
            this.location.longitude = this.location.coordinates[0];
            this.location.latitude = this.location.coordinates[1];
        }
    }
});

ngoSchema.index({ isVerified: 1, isActive: 1 });
ngoSchema.index({ city: 1 });
ngoSchema.index({ location: '2dsphere' });

const NGO = mongoose.model('NGO', ngoSchema);
export default NGO;
