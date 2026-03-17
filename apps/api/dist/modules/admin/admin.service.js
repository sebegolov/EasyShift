"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
const users_service_1 = require("../users/users.service");
let AdminService = class AdminService {
    prisma;
    subscriptionsService;
    usersService;
    constructor(prisma, subscriptionsService, usersService) {
        this.prisma = prisma;
        this.subscriptionsService = subscriptionsService;
        this.usersService = usersService;
    }
    getDeveloperTelegramIds() {
        return (process.env.DEVELOPER_TELEGRAM_IDS ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }
    ensureDeveloperAccess(telegramId) {
        const developerTelegramIds = this.getDeveloperTelegramIds();
        if (process.env.NODE_ENV !== 'production' && developerTelegramIds.length === 0) {
            return;
        }
        if (!telegramId) {
            throw new common_1.ForbiddenException({
                code: 'DEVELOPER_ACCESS_REQUIRED',
                message: 'Нужен telegramId разработчика.',
            });
        }
        if (developerTelegramIds.length === 0 || !developerTelegramIds.includes(String(telegramId))) {
            throw new common_1.ForbiddenException({
                code: 'DEVELOPER_ACCESS_DENIED',
                message: 'Доступ к developer admin закрыт.',
            });
        }
    }
    parsePagination(input) {
        const page = Math.max(Number(input?.page ?? 1) || 1, 1);
        const pageSize = Math.min(Math.max(Number(input?.pageSize ?? 20) || 20, 1), 100);
        return {
            page,
            pageSize,
            skip: (page - 1) * pageSize,
        };
    }
    buildUserWhere(input) {
        const where = {};
        if (input?.role) {
            where.role = input.role;
        }
        if (input?.status) {
            where.status = input.status;
        }
        if (input?.search) {
            where.OR = [
                {
                    fullName: {
                        contains: input.search,
                        mode: 'insensitive',
                    },
                },
                {
                    phone: {
                        contains: input.search,
                        mode: 'insensitive',
                    },
                },
                {
                    telegramId: {
                        contains: input.search,
                        mode: 'insensitive',
                    },
                },
            ];
        }
        return where;
    }
    async getStats(telegramId) {
        this.ensureDeveloperAccess(telegramId);
        const [totalUsers, draftUsers, activeUsers, deletedUsers, ownerUsers, workerUsers, linkedTelegramUsers, linkedPhoneUsers, totalPvz, draftShifts, collectingShifts, assignedShifts, completedShifts, cancelledShifts, activeSubscriptions, openIncidents, resolvedIncidents, trustedWorkers] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { status: 'draft' } }),
            this.prisma.user.count({ where: { status: 'active' } }),
            this.prisma.user.count({ where: { status: 'deleted' } }),
            this.prisma.user.count({ where: { role: 'owner' } }),
            this.prisma.user.count({ where: { role: 'worker' } }),
            this.prisma.user.count({ where: { telegramId: { not: null } } }),
            this.prisma.user.count({ where: { phone: { not: null } } }),
            this.prisma.pVZ.count(),
            this.prisma.shift.count({ where: { status: 'draft' } }),
            this.prisma.shift.count({ where: { status: 'collecting_responses' } }),
            this.prisma.shift.count({ where: { status: 'assigned' } }),
            this.prisma.shift.count({ where: { status: 'completed' } }),
            this.prisma.shift.count({ where: { status: 'cancelled' } }),
            this.prisma.ownerSubscription.count({ where: { status: 'active' } }),
            this.prisma.incident.count({ where: { status: 'open' } }),
            this.prisma.incident.count({ where: { status: 'resolved' } }),
            this.prisma.workerProfile.count({ where: { verificationStatus: 'trusted_worker' } }),
        ]);
        return {
            users: {
                total: totalUsers,
                draft: draftUsers,
                active: activeUsers,
                deleted: deletedUsers,
                owner: ownerUsers,
                worker: workerUsers,
                withTelegram: linkedTelegramUsers,
                withPhone: linkedPhoneUsers,
            },
            operations: {
                pvz: totalPvz,
                shifts: {
                    draft: draftShifts,
                    collectingResponses: collectingShifts,
                    assigned: assignedShifts,
                    completed: completedShifts,
                    cancelled: cancelledShifts,
                },
                incidents: {
                    open: openIncidents,
                    resolved: resolvedIncidents,
                },
            },
            subscriptions: {
                active: activeSubscriptions,
            },
            workers: {
                trusted: trustedWorkers,
            },
        };
    }
    async listUsers(input) {
        this.ensureDeveloperAccess(input?.telegramId);
        const { page, pageSize, skip } = this.parsePagination(input);
        const where = this.buildUserWhere(input);
        const [items, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                include: {
                    ownerProfile: true,
                    workerProfile: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            pageSize,
        };
    }
    async getUserDetails(telegramId, id) {
        this.ensureDeveloperAccess(telegramId);
        const user = await this.usersService.getCurrentUser({ userId: id });
        const incidentWhere = {
            OR: [],
        };
        if (user.ownerProfile) {
            incidentWhere.OR.push({ ownerId: user.ownerProfile.id });
        }
        if (user.workerProfile) {
            incidentWhere.OR.push({ workerId: user.workerProfile.id });
        }
        const [notifications, subscriptions, incidents] = await Promise.all([
            this.prisma.notificationEvent.findMany({
                where: { userId: id },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            user.ownerProfile
                ? this.prisma.ownerSubscription.findMany({
                    where: { ownerId: user.ownerProfile.id },
                    orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
                })
                : [],
            incidentWhere.OR.length > 0
                ? this.prisma.incident.findMany({
                    where: incidentWhere,
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                })
                : [],
        ]);
        return {
            user,
            notifications,
            subscriptions,
            incidents,
        };
    }
    async listShifts(telegramId) {
        this.ensureDeveloperAccess(telegramId);
        return this.prisma.shift.findMany({
            include: {
                applications: true,
                assignment: true,
                attendance: true,
            },
            orderBy: { startAt: 'desc' },
        });
    }
    async listIncidents(telegramId) {
        this.ensureDeveloperAccess(telegramId);
        return this.prisma.incident.findMany({
            include: {
                shift: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async listSubscriptions(telegramId) {
        this.ensureDeveloperAccess(telegramId);
        return this.prisma.ownerSubscription.findMany({
            orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
        });
    }
    listPlans(telegramId) {
        this.ensureDeveloperAccess(telegramId);
        return this.subscriptionsService.listPlans();
    }
    upsertPlan(telegramId, input) {
        this.ensureDeveloperAccess(telegramId);
        return this.subscriptionsService.upsertPlanDefinition(input);
    }
    async trustWorker(telegramId, workerId) {
        this.ensureDeveloperAccess(telegramId);
        const worker = await this.prisma.workerProfile.findUnique({
            where: { id: workerId },
        });
        if (!worker) {
            return { error: 'worker_not_found' };
        }
        return this.prisma.workerProfile.update({
            where: { id: workerId },
            data: { verificationStatus: 'trusted_worker' },
        });
    }
    async resolveIncident(telegramId, incidentId) {
        this.ensureDeveloperAccess(telegramId);
        const incident = await this.prisma.incident.findUnique({
            where: { id: incidentId },
        });
        if (!incident) {
            return { error: 'incident_not_found' };
        }
        return this.prisma.incident.update({
            where: { id: incidentId },
            data: { status: 'resolved' },
        });
    }
    getOwnerEntitlements(telegramId, ownerId) {
        this.ensureDeveloperAccess(telegramId);
        return this.subscriptionsService.getOwnerEntitlements(ownerId);
    }
    assignOwnerSubscription(telegramId, ownerId, input) {
        this.ensureDeveloperAccess(telegramId);
        return this.subscriptionsService.assignPlanToOwner({
            ownerId,
            planCode: input.planCode,
            version: input.version,
            startsAt: input.startsAt,
            source: input.source,
        });
    }
    async deleteUser(telegramId, userId) {
        this.ensureDeveloperAccess(telegramId);
        return this.usersService.hardDeleteUser(userId);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        subscriptions_service_1.SubscriptionsService,
        users_service_1.UsersService])
], AdminService);
