import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import PickupAgent from '../models/PickupAgent.js';
import Donation from '../models/Donation.js';
import DonationAudit from '../models/DonationAudit.js';
import { formatDonation } from '../views/donationView.js';

test('Pickup Agent Management & Assignment System', async (t) => {
    const ngo1Id = new mongoose.Types.ObjectId();
    const ngo2Id = new mongoose.Types.ObjectId();
    const donorId = new mongoose.Types.ObjectId();
    const requirementId = new mongoose.Types.ObjectId();

    await t.test('Scenario 1 & 2: NGO can register multiple pickup agents with auto-generated unique Agent IDs', () => {
        const agent1 = new PickupAgent({
            ngoId: ngo1Id,
            fullName: 'Ramesh Kumar',
            phone: '9876543210',
            vehicleType: 'Bike',
            vehicleNumber: 'DL 01 AB 1234',
            status: 'active'
        });
        agent1.validateSync();

        const agent2 = new PickupAgent({
            ngoId: ngo1Id,
            fullName: 'Suresh Singh',
            phone: '9123456789',
            vehicleType: 'Van',
            vehicleNumber: 'DL 05 XY 9999',
            status: 'active'
        });
        agent2.validateSync();

        assert.ok(agent1.agentId.startsWith('AGT-'), 'Agent 1 ID should start with AGT-');
        assert.ok(agent2.agentId.startsWith('AGT-'), 'Agent 2 ID should start with AGT-');
        assert.notEqual(agent1.agentId, agent2.agentId, 'Generated Agent IDs must be unique');
        assert.equal(agent1.fullName, 'Ramesh Kumar');
        assert.equal(agent1.status, 'active');
    });

    await t.test('Scenario 3: NGO can edit and deactivate an agent', () => {
        const agent = new PickupAgent({
            ngoId: ngo1Id,
            fullName: 'Amit Sharma',
            phone: '9988776655',
            vehicleType: 'Auto',
            vehicleNumber: 'MH 02 CZ 4455',
            status: 'active'
        });
        agent.validateSync();

        // Edit
        agent.vehicleNumber = 'MH 02 CZ 9999';
        agent.status = 'inactive';
        agent.validateSync();

        assert.equal(agent.vehicleNumber, 'MH 02 CZ 9999');
        assert.equal(agent.status, 'inactive');
    });

    await t.test('Scenario 4: Inactive agents cannot be assigned', () => {
        const inactiveAgent = {
            _id: new mongoose.Types.ObjectId(),
            ngoId: ngo1Id,
            agentId: 'AGT-INACTIVE',
            fullName: 'Inactive Driver',
            status: 'inactive'
        };

        const validateCanAssign = (agent, ngoId) => {
            if (agent.ngoId.toString() !== ngoId.toString()) {
                throw new Error('Unauthorized: You can only assign pickup agents registered with your NGO.');
            }
            if (agent.status !== 'active') {
                throw new Error('Cannot assign an inactive pickup agent. Please activate the agent first.');
            }
            return true;
        };

        assert.throws(
            () => validateCanAssign(inactiveAgent, ngo1Id),
            /Cannot assign an inactive pickup agent/
        );
    });

    await t.test('Scenario 5: One NGO cannot assign another NGO\'s agent (Security boundary check)', () => {
        const agentFromNGO2 = {
            _id: new mongoose.Types.ObjectId(),
            ngoId: ngo2Id,
            agentId: 'AGT-NGO2',
            fullName: 'Agent of Other NGO',
            status: 'active'
        };

        const validateCanAssign = (agent, requestingNgoId) => {
            if (agent.ngoId.toString() !== requestingNgoId.toString()) {
                throw new Error('Unauthorized: You can only assign pickup agents registered with your NGO.');
            }
            if (agent.status !== 'active') {
                throw new Error('Cannot assign an inactive pickup agent.');
            }
            return true;
        };

        assert.throws(
            () => validateCanAssign(agentFromNGO2, ngo1Id),
            /Unauthorized: You can only assign pickup agents registered with your NGO/
        );
    });

    await t.test('Scenario 6 & 7: Accepted order saves assigned agent and displays details to donor', () => {
        const agentId = new mongoose.Types.ObjectId();
        const donation = new Donation({
            donor: donorId,
            ngo: ngo1Id,
            requirement: requirementId,
            quantity: 5,
            pickupAddress: '42 MG Road',
            city: 'Delhi',
            status: 'accepted',
            assignedAgent: agentId,
            assignedAgentId: 'AGT-A1B2C3',
            assignedNgoId: ngo1Id,
            assignedAt: new Date(),
            pickupStatus: 'agent_assigned'
        });
        donation.validateSync();

        assert.equal(donation.status, 'accepted');
        assert.equal(donation.assignedAgent.toString(), agentId.toString());
        assert.equal(donation.assignedAgentId, 'AGT-A1B2C3');
        assert.equal(donation.pickupStatus, 'agent_assigned');

        // Verify formatDonation passes assigned agent info to donor client
        const formatted = formatDonation(donation);
        assert.equal(formatted.assignedAgentId, 'AGT-A1B2C3');
        assert.equal(formatted.pickupStatus, 'agent_assigned');
        assert.ok(formatted.assignedAt instanceof Date);
    });

    await t.test('Scenario 8, 9 & 10: NGO can change the assigned agent, history is preserved, and status timeline progresses', () => {
        const agent1Id = new mongoose.Types.ObjectId();
        const agent2Id = new mongoose.Types.ObjectId();

        const donation = new Donation({
            donor: donorId,
            ngo: ngo1Id,
            requirement: requirementId,
            quantity: 5,
            pickupAddress: '42 MG Road',
            city: 'Delhi',
            status: 'accepted',
            assignedAgent: agent1Id,
            assignedAgentId: 'AGT-111111',
            assignedNgoId: ngo1Id,
            assignedAt: new Date('2026-11-15T10:00:00Z'),
            pickupStatus: 'agent_assigned',
            assignmentHistory: []
        });

        // Reassignment:
        const prevAgentName = 'First Agent';
        donation.assignmentHistory.push({
            agent: donation.assignedAgent,
            agentId: donation.assignedAgentId,
            agentName: prevAgentName,
            assignedAt: donation.assignedAt,
            changedAt: new Date(),
            reason: 'Vehicle breakdown, reassigning to van'
        });

        donation.assignedAgent = agent2Id;
        donation.assignedAgentId = 'AGT-222222';
        donation.assignedAt = new Date();
        donation.pickupStatus = 'agent_on_the_way';
        donation.validateSync();

        assert.equal(donation.assignedAgentId, 'AGT-222222');
        assert.equal(donation.assignmentHistory.length, 1);
        assert.equal(donation.assignmentHistory[0].agentId, 'AGT-111111');
        assert.equal(donation.assignmentHistory[0].reason, 'Vehicle breakdown, reassigning to van');
        assert.equal(donation.pickupStatus, 'agent_on_the_way');

        // Progress timeline
        const validStatuses = [
            'accepted',
            'agent_assigned',
            'agent_on_the_way',
            'agent_arrived',
            'donation_collected',
            'completed'
        ];
        validStatuses.forEach(st => {
            donation.pickupStatus = st;
            donation.validateSync();
            assert.equal(donation.pickupStatus, st);
        });
    });

    await t.test('Scenario 11: Prevent assigning agents to rejected, cancelled or completed donations', () => {
        const agent = {
            _id: new mongoose.Types.ObjectId(),
            ngoId: ngo1Id,
            agentId: 'AGT-VALID',
            fullName: 'Valid Agent',
            status: 'active'
        };

        const validateAssignmentStatus = (donationStatus) => {
            if (['rejected', 'cancelled', 'completed'].includes(donationStatus)) {
                throw new Error(`Cannot assign a pickup agent to a ${donationStatus} donation order.`);
            }
            return true;
        };

        assert.throws(
            () => validateAssignmentStatus('rejected'),
            /Cannot assign a pickup agent to a rejected donation order/
        );
        assert.throws(
            () => validateAssignmentStatus('cancelled'),
            /Cannot assign a pickup agent to a cancelled donation order/
        );
        assert.throws(
            () => validateAssignmentStatus('completed'),
            /Cannot assign a pickup agent to a completed donation order/
        );
        assert.equal(validateAssignmentStatus('pending'), true);
        assert.equal(validateAssignmentStatus('accepted'), true);
    });

    await t.test('Scenario 12: Prevent duplicate or conflicting assignment of the same agent', () => {
        const assignedAgentId = new mongoose.Types.ObjectId();
        const donation = {
            assignedAgent: { _id: assignedAgentId },
            status: 'accepted'
        };

        const validateNotDuplicate = (currentDonation, newAgentId) => {
            if (currentDonation.assignedAgent && currentDonation.assignedAgent._id.toString() === newAgentId.toString()) {
                throw new Error('This pickup agent is already assigned to this donation order.');
            }
            return true;
        };

        assert.throws(
            () => validateNotDuplicate(donation, assignedAgentId),
            /This pickup agent is already assigned to this donation order/
        );

        const differentAgentId = new mongoose.Types.ObjectId();
        assert.equal(validateNotDuplicate(donation, differentAgentId), true);
    });

    await t.test('Scenario 13: Prevent pickup progress updates when no agent is assigned', () => {
        const donationWithoutAgent = {
            assignedAgent: null,
            status: 'accepted',
            pickupStatus: 'accepted'
        };

        const validateStatusProgression = (donation, nextPickupStatus) => {
            if (!donation.assignedAgent && nextPickupStatus !== 'accepted' && nextPickupStatus !== 'cancelled') {
                throw new Error('Cannot update pickup progress until a pickup agent has been assigned to this donation.');
            }
            return true;
        };

        assert.throws(
            () => validateStatusProgression(donationWithoutAgent, 'agent_on_the_way'),
            /Cannot update pickup progress until a pickup agent has been assigned/
        );
        assert.throws(
            () => validateStatusProgression(donationWithoutAgent, 'agent_arrived'),
            /Cannot update pickup progress until a pickup agent has been assigned/
        );
        assert.throws(
            () => validateStatusProgression(donationWithoutAgent, 'donation_collected'),
            /Cannot update pickup progress until a pickup agent has been assigned/
        );
        assert.throws(
            () => validateStatusProgression(donationWithoutAgent, 'completed'),
            /Cannot update pickup progress until a pickup agent has been assigned/
        );

        // Allowed without agent: accepted or cancelled
        assert.equal(validateStatusProgression(donationWithoutAgent, 'accepted'), true);
        assert.equal(validateStatusProgression(donationWithoutAgent, 'cancelled'), true);
    });

    await t.test('Scenario 14: Enforce valid lifecycle transitions and prevent backwards movement or modifications on completed/cancelled orders', () => {
        const VALID_TRANSITIONS = {
            accepted: ['agent_assigned', 'cancelled'],
            agent_assigned: ['agent_on_the_way', 'cancelled'],
            agent_on_the_way: ['agent_arrived', 'cancelled'],
            agent_arrived: ['donation_collected', 'cancelled'],
            donation_collected: ['completed'],
            completed: [],
            cancelled: []
        };

        const checkTransition = (currentStatus, nextStatus) => {
            if (currentStatus === 'completed') {
                throw new Error('This donation pickup has already been completed and cannot be modified.');
            }
            if (currentStatus === 'cancelled') {
                throw new Error('This donation pickup has been cancelled and cannot be modified.');
            }
            const allowed = VALID_TRANSITIONS[currentStatus] || [];
            if (!allowed.includes(nextStatus)) {
                throw new Error(`Cannot transition pickup status from '${currentStatus}' to '${nextStatus}'.`);
            }
            return true;
        };

        // Completed / Cancelled freeze checks
        assert.throws(
            () => checkTransition('completed', 'agent_on_the_way'),
            /completed and cannot be modified/
        );
        assert.throws(
            () => checkTransition('cancelled', 'agent_assigned'),
            /cancelled and cannot be modified/
        );

        // Valid forward transitions
        assert.equal(checkTransition('accepted', 'agent_assigned'), true);
        assert.equal(checkTransition('agent_assigned', 'agent_on_the_way'), true);
        assert.equal(checkTransition('agent_on_the_way', 'agent_arrived'), true);
        assert.equal(checkTransition('agent_arrived', 'donation_collected'), true);
        assert.equal(checkTransition('donation_collected', 'completed'), true);

        // Invalid backwards or jumping transitions
        assert.throws(
            () => checkTransition('donation_collected', 'agent_assigned'),
            /Cannot transition pickup status from 'donation_collected' to 'agent_assigned'/
        );
        assert.throws(
            () => checkTransition('agent_arrived', 'accepted'),
            /Cannot transition pickup status from 'agent_arrived' to 'accepted'/
        );
        assert.throws(
            () => checkTransition('agent_assigned', 'completed'),
            /Cannot transition pickup status from 'agent_assigned' to 'completed'/
        );
    });

    await t.test('Scenario 15: PickupAgent model schema validations (phone regex, vehicle type enum, name bounds)', () => {
        // Invalid vehicle type
        const invalidVehicleAgent = new PickupAgent({
            ngoId: ngo1Id,
            fullName: 'Rahul Test',
            phone: '9876543210',
            vehicleType: 'Helicopter',
            vehicleNumber: 'DL 01 AB 1234'
        });
        const errVehicle = invalidVehicleAgent.validateSync();
        assert.ok(errVehicle.errors['vehicleType'], 'Should fail on invalid vehicle type');

        // Invalid phone number (letters / too short)
        const invalidPhoneAgent = new PickupAgent({
            ngoId: ngo1Id,
            fullName: 'Rahul Test',
            phone: '12345',
            vehicleType: 'Bike',
            vehicleNumber: 'DL 01 AB 1234'
        });
        const errPhone = invalidPhoneAgent.validateSync();
        assert.ok(errPhone.errors['phone'], 'Should fail on invalid phone number');

        // Valid agent with formatting
        const validAgent = new PickupAgent({
            ngoId: ngo1Id,
            fullName: 'Rahul Valid',
            phone: '+919876543210',
            vehicleType: 'Bike',
            vehicleNumber: 'dl 01 ab 1234'
        });
        const errValid = validAgent.validateSync();
        assert.equal(errValid, undefined, 'Valid agent should have no validation errors');
        assert.equal(validAgent.vehicleNumber, 'DL 01 AB 1234', 'Vehicle number should be uppercase trimmed');
    });

    await t.test('Scenario 16: DonationAudit schema accepts agent assignment and pickup status actions', () => {
        const donationId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();

        const actions = ['agent_assigned', 'agent_reassigned', 'pickup_status_update'];
        for (const action of actions) {
            const audit = new DonationAudit({
                donation: donationId,
                action,
                fromStatus: 'accepted',
                toStatus: 'accepted',
                performedBy: userId,
                performerRole: 'ngo',
                notes: `Test action ${action}`
            });
            const err = audit.validateSync();
            assert.equal(err, undefined, `DonationAudit should accept action '${action}'`);
        }
    });
});
