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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
const bad_words_config_1 = require("../../config/bad-words.config");
let UsersService = class UsersService {
    prisma;
    subscriptionsService;
    constructor(prisma, subscriptionsService) {
        this.prisma = prisma;
        this.subscriptionsService = subscriptionsService;
    }
    async resolveUserIdentity(input) {
        const userId = input?.userId?.trim?.();
        const telegramId = input?.telegramId ? String(input.telegramId).trim() : '';
        if (!userId && !telegramId) {
            throw new common_1.BadRequestException({
                code: 'USER_IDENTITY_REQUIRED',
                message: 'Нужен userId или telegramId.',
            });
        }
        const user = await this.prisma.user.findUnique({
            where: userId ? { id: userId } : { telegramId },
            include: {
                ownerProfile: true,
                workerProfile: {
                    include: {
                        zones: {
                            orderBy: {
                                createdAt: 'asc',
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException({
                code: 'USER_NOT_FOUND',
                message: 'Пользователь не найден.',
            });
        }
        return user;
    }
    async buildDependencySummary(user) {
        const ownerProfileId = user.ownerProfile?.id;
        const workerProfileId = user.workerProfile?.id;
        const [ownerPvzCount, ownerShiftCount, ownerSubscriptionCount, workerZoneCount, workerApplicationCount, workerAssignmentCount, workerAttendanceCount, workerIncidentCount, notificationsCount] = await Promise.all([
            ownerProfileId
                ? this.prisma.pVZ.count({
                    where: { ownerId: ownerProfileId },
                })
                : 0,
            ownerProfileId
                ? this.prisma.shift.count({
                    where: { ownerId: ownerProfileId },
                })
                : 0,
            ownerProfileId
                ? this.prisma.ownerSubscription.count({
                    where: { ownerId: ownerProfileId },
                })
                : 0,
            workerProfileId
                ? this.prisma.workerZone.count({
                    where: { workerProfileId },
                })
                : 0,
            workerProfileId
                ? this.prisma.shiftApplication.count({
                    where: { workerId: workerProfileId },
                })
                : 0,
            workerProfileId
                ? this.prisma.shiftAssignment.count({
                    where: { workerId: workerProfileId },
                })
                : 0,
            workerProfileId
                ? this.prisma.attendance.count({
                    where: { workerId: workerProfileId },
                })
                : 0,
            workerProfileId
                ? this.prisma.incident.count({
                    where: { workerId: workerProfileId },
                })
                : 0,
            this.prisma.notificationEvent.count({
                where: { userId: user.id },
            }),
        ]);
        const ownerCanReset = ownerPvzCount === 0 && ownerShiftCount === 0;
        const workerCanReset = workerApplicationCount === 0 &&
            workerAssignmentCount === 0 &&
            workerAttendanceCount === 0 &&
            workerIncidentCount === 0;
        return {
            owner: {
                pvzCount: ownerPvzCount,
                shiftCount: ownerShiftCount,
                subscriptionCount: ownerSubscriptionCount,
                canReset: ownerCanReset,
            },
            worker: {
                zoneCount: workerZoneCount,
                applicationCount: workerApplicationCount,
                assignmentCount: workerAssignmentCount,
                attendanceCount: workerAttendanceCount,
                incidentCount: workerIncidentCount,
                canReset: workerCanReset,
            },
            notificationsCount,
        };
    }
    async getCurrentUser(input) {
        const user = await this.resolveUserIdentity(input);
        const dependencies = await this.buildDependencySummary(user);
        const entitlements = user.ownerProfile
            ? await this.subscriptionsService.getOwnerEntitlements(user.ownerProfile.id)
            : null;
        return {
            ...user,
            entitlements,
            dependencies,
            canDeleteAccount: dependencies.owner.canReset && dependencies.worker.canReset,
            profileState: {
                owner: {
                    isActive: user.role === 'owner',
                    isCompleted: Boolean(user.ownerProfile),
                },
                worker: {
                    isActive: user.role === 'worker',
                    isCompleted: Boolean(user.workerProfile),
                },
            },
        };
    }
    ensureActiveAccount(user) {
        if (user.status === 'deleted' || user.role === 'deleted') {
            throw new common_1.ConflictException({
                code: 'ACCOUNT_DELETED',
                message: 'Аккаунт уже удален.',
            });
        }
    }
    ensureSupportedRole(targetRole) {
        if (!['owner', 'worker'].includes(targetRole)) {
            throw new common_1.BadRequestException({
                code: 'UNSUPPORTED_ROLE',
                message: 'Доступны только роли owner и worker.',
            });
        }
    }
    async cleanupRoleData(tx, user, targetRole, dependencies) {
        if (targetRole === 'owner' && user.workerProfile) {
            if (!dependencies.worker.canReset) {
                throw new common_1.ConflictException({
                    code: 'WORKER_ROLE_HAS_DEPENDENCIES',
                    message: 'Нельзя переключить роль, пока у работника есть связанные данные.',
                    dependencies: dependencies.worker,
                });
            }
            await tx.workerZone.deleteMany({
                where: { workerProfileId: user.workerProfile.id },
            });
            await tx.workerProfile.delete({
                where: { id: user.workerProfile.id },
            });
        }
        if (targetRole === 'worker' && user.ownerProfile) {
            if (!dependencies.owner.canReset) {
                throw new common_1.ConflictException({
                    code: 'OWNER_ROLE_HAS_DEPENDENCIES',
                    message: 'Нельзя переключить роль, пока у работодателя есть связанные данные.',
                    dependencies: dependencies.owner,
                });
            }
            await tx.ownerSubscription.deleteMany({
                where: { ownerId: user.ownerProfile.id },
            });
            await tx.ownerProfile.delete({
                where: { id: user.ownerProfile.id },
            });
        }
    }
    async switchRole(input) {
        this.ensureSupportedRole(input.targetRole);
        const user = await this.resolveUserIdentity(input);
        this.ensureActiveAccount(user);
        if (user.role === input.targetRole) {
            return {
                ...(await this.getCurrentUser({ userId: user.id })),
                nextStep: input.targetRole === 'owner' ? 'complete_owner_profile' : 'complete_worker_profile',
            };
        }
        const dependencies = await this.buildDependencySummary(user);
        await this.prisma.$transaction(async (tx) => {
            await this.cleanupRoleData(tx, user, input.targetRole, dependencies);
            await tx.user.update({
                where: { id: user.id },
                data: {
                    role: input.targetRole,
                    status: 'draft',
                },
            });
        });
        return {
            ...(await this.getCurrentUser({ userId: user.id })),
            nextStep: input.targetRole === 'owner' ? 'complete_owner_profile' : 'complete_worker_profile',
        };
    }
    async deleteAccount(input) {
        const user = await this.resolveUserIdentity(input);
        this.ensureActiveAccount(user);
        const dependencies = await this.buildDependencySummary(user);
        if (!dependencies.owner.canReset || !dependencies.worker.canReset) {
            throw new common_1.ConflictException({
                code: 'ACCOUNT_DELETE_BLOCKED',
                message: 'Нельзя удалить аккаунт, пока есть связанные данные.',
                dependencies,
            });
        }
        await this.prisma.$transaction(async (tx) => {
            if (user.workerProfile) {
                await tx.workerZone.deleteMany({
                    where: { workerProfileId: user.workerProfile.id },
                });
                await tx.workerProfile.delete({
                    where: { id: user.workerProfile.id },
                });
            }
            if (user.ownerProfile) {
                await tx.ownerSubscription.deleteMany({
                    where: { ownerId: user.ownerProfile.id },
                });
                await tx.ownerProfile.delete({
                    where: { id: user.ownerProfile.id },
                });
            }
            await tx.user.update({
                where: { id: user.id },
                data: {
                    fullName: 'Удаленный пользователь',
                    phone: null,
                    telegramId: user.telegramId ? `deleted:${user.id}:${Date.now()}` : null,
                    role: 'deleted',
                    status: 'deleted',
                },
            });
        });
        return {
            ok: true,
            userId: user.id,
            status: 'deleted',
        };
    }
    async hardDeleteUser(userId) {
        const user = await this.resolveUserIdentity({ userId });
        await this.prisma.$transaction(async (tx) => {
            const ownerId = user.ownerProfile?.id;
            const workerId = user.workerProfile?.id;
            if (ownerId) {
                const shiftIds = await tx.shift.findMany({ where: { ownerId }, select: { id: true } }).then((s) => s.map((x) => x.id));
                if (shiftIds.length > 0) {
                    await tx.incident.deleteMany({ where: { shiftId: { in: shiftIds } } });
                    await tx.attendance.deleteMany({ where: { shiftId: { in: shiftIds } } });
                    await tx.shiftAssignment.deleteMany({ where: { shiftId: { in: shiftIds } } });
                    await tx.shiftApplication.deleteMany({ where: { shiftId: { in: shiftIds } } });
                    await tx.shift.deleteMany({ where: { ownerId } });
                }
                await tx.pVZ.deleteMany({ where: { ownerId } });
                await tx.ownerSubscription.deleteMany({ where: { ownerId } });
                await tx.ownerProfile.delete({ where: { id: ownerId } });
            }
            if (workerId) {
                await tx.incident.deleteMany({ where: { workerId } });
                await tx.attendance.deleteMany({ where: { workerId } });
                await tx.shiftAssignment.deleteMany({ where: { workerId } });
                await tx.shiftApplication.deleteMany({ where: { workerId } });
                await tx.workerZone.deleteMany({ where: { workerProfileId: workerId } });
                await tx.workerProfile.delete({ where: { id: workerId } });
            }
            await tx.notificationEvent.deleteMany({ where: { userId: user.id } });
            await tx.user.delete({ where: { id: user.id } });
        });
        return { ok: true, userId: user.id };
    }
    normalizeDisplayName(raw) {
        if (!raw) {
            return '';
        }
        let value = String(raw).toLowerCase();
        const leetMap = {
            '@': 'а',
            '4': 'ч',
            '3': 'з',
            '0': 'о',
            '6': 'б',
            '9': 'д',
            '$': 'с',
        };
        value = value
            .split('')
            .map((ch) => leetMap[ch] ?? ch)
            .join('');
        return value.replace(/\s+/g, ' ').trim();
    }
    ensureCleanDisplayName(rawName) {
        if (!rawName) {
            return;
        }
        const normalized = this.normalizeDisplayName(rawName);
        const hit = bad_words_config_1.BANNED_NAME_WORDS.find((word) => normalized.includes(word));
        if (hit) {
            throw new common_1.BadRequestException({
                code: 'FULLNAME_FORBIDDEN_WORDS',
                message: 'Имя содержит недопустимые слова. Пожалуйста, выберите другое.',
            });
        }
    }
    async upsertOwnerProfile(input) {
        const existingUser = await this.resolveUserIdentity({ userId: input.userId });
        this.ensureActiveAccount(existingUser);
        if (existingUser.role !== 'owner' || existingUser.workerProfile) {
            await this.switchRole({
                userId: input.userId,
                targetRole: 'owner',
            });
        }
        this.ensureCleanDisplayName(input.contactName);
        await this.prisma.user.update({
            where: { id: input.userId },
            data: {
                fullName: input.contactName,
                phone: input.contactPhone,
                role: 'owner',
                status: 'active',
            },
        });
        const ownerProfile = await this.prisma.ownerProfile.upsert({
            where: { userId: input.userId },
            update: {
                companyName: input.companyName,
                contactName: input.contactName,
                contactPhone: input.contactPhone,
            },
            create: {
                userId: input.userId,
                companyName: input.companyName,
                contactName: input.contactName,
                contactPhone: input.contactPhone,
            },
        });
        const entitlements = await this.subscriptionsService.getOwnerEntitlements(ownerProfile.id);
        return {
            ...ownerProfile,
            entitlements,
        };
    }
    async upsertWorkerProfile(input) {
        const existingUser = await this.resolveUserIdentity({ userId: input.userId });
        this.ensureActiveAccount(existingUser);
        if (existingUser.role !== 'worker' || existingUser.ownerProfile) {
            await this.switchRole({
                userId: input.userId,
                targetRole: 'worker',
            });
        }
        const displayName = existingUser.fullName || input.experienceSummary || 'Worker profile';
        this.ensureCleanDisplayName(displayName);
        await this.prisma.user.update({
            where: { id: input.userId },
            data: {
                fullName: displayName,
                role: 'worker',
                status: 'active',
            },
        });
        return this.prisma.workerProfile.upsert({
            where: { userId: input.userId },
            update: {
                city: input.city,
                expectedRate: input.expectedRate,
            },
            create: {
                userId: input.userId,
                city: input.city,
                expectedRate: input.expectedRate,
                verificationStatus: 'phone_verified',
                reliabilityScore: 50,
                completedShiftsCount: 0,
            },
        });
    }
    createWorkerZone(input) {
        return this.prisma.workerZone.create({
            data: {
                workerProfileId: input.workerProfileId,
                label: input.label,
                centerLat: input.centerLat,
                centerLng: input.centerLng,
                radiusKm: input.radiusKm,
                preferredRate: input.preferredRate,
                color: input.color ?? '#5f7cff',
                isActive: true,
            },
        });
    }
    getWorkerProfile(id) {
        return this.prisma.workerProfile.findUnique({
            where: { id },
            include: {
                user: true,
                zones: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        subscriptions_service_1.SubscriptionsService])
], UsersService);
