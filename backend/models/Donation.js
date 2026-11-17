import mongoose from 'mongoose';
import crypto from 'crypto';

const donationSchema = new mongoose.Schema(
    {
        donor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Donation must have a donor']
        },
        ngo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NGO',
            required: [true, 'Donation must be targeted to an NGO']
        },
        requirement: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Requirement',
            required: [true, 'Donation must reference a requirement']
        },
        quantity: {
            type: Number,
            required: [true, 'Donation quantity is required'],
            min: [1, 'Donation quantity must be at least 1']
        },
        description: {
            type: String,
            default: '',
            trim: true
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
        state: {
            type: String,
            default: '',
            trim: true
        },
        pickupLocation: {
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
                enum: ['unverified', 'donor_confirmed', 'geocoded', 'gps_verified', 'manual_map_selected'],
                default: 'unverified'
            },
            lastUpdatedAt: { type: Date, default: null }
        },
        image: {
            type: String,
            default: ''
        },
        clothesType: {
            type: String,
            default: '',
            trim: true
        },
        targetAgeGroup: {
            type: String,
            default: '',
            trim: true
        },
        size: {
            type: String,
            default: '',
            trim: true
        },
        bookClass: {
            type: String,
            default: '',
            trim: true
        },
        bookType: {
            type: String,
            default: '',
            trim: true
        },
        bookName: {
            type: String,
            default: '',
            trim: true
        },
        foodType: {
            type: String,
            default: '',
            trim: true
        },
        electronicType: {
            type: String,
            default: '',
            trim: true
        },
        medicineType: {
            type: String,
            default: '',
            trim: true
        },
        customItems: {
            type: String,
            default: '',
            trim: true
        },
        extraItems: {
            type: String,
            default: '',
            trim: true
        },
        verificationCode: {
            type: String,
            default: '',
            trim: true,
            index: true
        },
        verificationCodeExpiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        isVerificationCodeUsed: {
            type: Boolean,
            default: false,
            index: true
        },
        verificationCodeVerifiedAt: {
            type: Date,
            default: null
        },
        qrPayload: {
            type: String,
            default: ''
        },
        evidenceImages: [{
            type: String,
            trim: true
        }],
        distributionDate: {
            type: Date,
            default: null
        },
        distributionNotes: {
            type: String,
            default: '',
            trim: true
        },
        scheduledPickupDate: {
            type: Date,
            default: null
        },
        assignedAgent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PickupAgent',
            default: null,
            index: true
        },
        assignedAgentId: {
            type: String,
            default: '',
            trim: true
        },
        assignedNgoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NGO',
            default: null
        },
        assignedAt: {
            type: Date,
            default: null
        },
        pickupStatus: {
            type: String,
            enum: [
                'accepted',
                'agent_assigned',
                'agent_on_the_way',
                'agent_nearby',
                'agent_arrived',
                'donation_collected',
                'completed',
                'cancelled'
            ],
            default: 'accepted'
        },
        agentLocation: {
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null },
            accuracy: { type: Number, default: null },
            heading: { type: Number, default: null },
            speed: { type: Number, default: null },
            updatedAt: { type: Date, default: null }
        },
        trackingSession: {
            initialRouteDistanceKm: { type: Number, default: null },
            startLocation: {
                latitude: { type: Number, default: null },
                longitude: { type: Number, default: null }
            },
            distanceToDonorKm: { type: Number, default: null },
            startedAt: { type: Date, default: null },
            lastActiveAt: { type: Date, default: null }
        },
        pickupTimeline: {
            agentAssignedAt: { type: Date, default: null },
            agentOnTheWayAt: { type: Date, default: null },
            agentNearbyAt: { type: Date, default: null },
            agentArrivedAt: { type: Date, default: null },
            donationCollectedAt: { type: Date, default: null },
            completedAt: { type: Date, default: null }
        },
        assignmentHistory: [
            {
                agent: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'PickupAgent'
                },
                agentId: { type: String, default: '' },
                agentName: { type: String, default: '' },
                assignedAt: { type: Date, default: Date.now },
                changedAt: { type: Date, default: Date.now },
                reason: { type: String, default: '' }
            }
        ],
        campaign: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign',
            default: null,
            index: true
        },
        isGroupContribution: {
            type: Boolean,
            default: false
        },
        isAnonymous: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            enum: [
                'pending',
                'accepted',
                'pickup_scheduled',
                'picked_up',
                'received',
                'distributed',
                'completed',
                'rejected',
                'cancelled'
            ],
            default: 'pending'
        }
    },
    {
        timestamps: true
    }
);

donationSchema.index({ donor: 1, createdAt: -1 });
donationSchema.index({ ngo: 1, status: 1 });
donationSchema.index({ ngo: 1, pickupStatus: 1 });
donationSchema.index({ assignedAgent: 1, pickupStatus: 1 });
donationSchema.index({ assignedAgent: 1, createdAt: -1 });
donationSchema.index({ requirement: 1, status: 1 });
donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ 'pickupLocation.coordinates': '2dsphere' }, { sparse: true });
donationSchema.index({ 'pickupLocation.verificationStatus': 1 });

donationSchema.pre('validate', function () {
    if (!this.verificationCode) {
        this.verificationCode = 'HC-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }
    if (!this.qrPayload) {
        this.qrPayload = `helpconnect://verify-donation?code=${this.verificationCode}&id=${this._id || ''}`;
    }
    if (this.pickupLocation) {
        if (this.pickupLocation.latitude != null && this.pickupLocation.longitude != null) {
            this.pickupLocation.coordinates = [Number(this.pickupLocation.longitude), Number(this.pickupLocation.latitude)];
            if (!this.pickupLocation.lastUpdatedAt) {
                this.pickupLocation.lastUpdatedAt = new Date();
            }
        } else if (Array.isArray(this.pickupLocation.coordinates) && this.pickupLocation.coordinates.length === 2) {
            this.pickupLocation.longitude = this.pickupLocation.coordinates[0];
            this.pickupLocation.latitude = this.pickupLocation.coordinates[1];
            if (!this.pickupLocation.lastUpdatedAt) {
                this.pickupLocation.lastUpdatedAt = new Date();
            }
        }
    }
});

const Donation = mongoose.model('Donation', donationSchema);
export default Donation;
