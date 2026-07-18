import type { LineUserProfile } from "@prisma/client";
import { z } from "zod";
import { getPrisma } from "./prisma";
import type { LineProfileView } from "./line-profile-view";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null).optional();
const optionalPhone = z.string().trim().max(30).refine(
  (value) => !value || /^[0-9+()\-\s]{7,30}$/.test(value),
  "手機格式不正確",
).transform((value) => value || null).optional();

export const lineProfileUpdateSchema = z.object({
  employeeName: optionalText(80),
  employeeNo: optionalText(50),
  department: optionalText(80),
  phone: optionalPhone,
  defaultPickupLocation: optionalText(120),
}).strict();

export type LineProfileUpdate = z.infer<typeof lineProfileUpdateSchema>;

export type VerifiedLineIdentity = {
  lineUserId: string;
  lineDisplayName: string | null;
  linePictureUrl: string | null;
};

export function maskLineUserId(value: string | null | undefined) {
  if (!value) return "—";
  if (value.length <= 9) return `${value.slice(0, 2)}…${value.slice(-2)}`;
  return `${value.slice(0, 5)}…${value.slice(-4)}`;
}

export function publicLineProfile(profile: LineUserProfile): LineProfileView {
  return {
    lineDisplayName: profile.lineDisplayName,
    linePictureUrl: profile.linePictureUrl,
    employeeName: profile.employeeName,
    employeeNo: profile.employeeNo,
    department: profile.department,
    phone: profile.phone,
    defaultPickupLocation: profile.defaultPickupLocation,
    lastUsedAt: profile.lastUsedAt.toISOString(),
  };
}

export async function upsertVerifiedLineProfile(identity: VerifiedLineIdentity) {
  const prisma = getPrisma();
  return prisma.lineUserProfile.upsert({
    where: { lineUserId: identity.lineUserId },
    create: {
      lineUserId: identity.lineUserId,
      lineDisplayName: identity.lineDisplayName,
      linePictureUrl: identity.linePictureUrl,
      lastUsedAt: new Date(),
    },
    update: {
      lineDisplayName: identity.lineDisplayName,
      linePictureUrl: identity.linePictureUrl,
      lastUsedAt: new Date(),
    },
  });
}

export async function getOwnLineProfile(profileId: string) {
  return getPrisma().lineUserProfile.findUnique({ where: { id: profileId } });
}

export async function updateOwnLineProfile(profileId: string, input: LineProfileUpdate) {
  const prisma = getPrisma();
  const existing = await prisma.lineUserProfile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!existing) return null;
  return prisma.lineUserProfile.update({
    where: { id: profileId },
    data: { ...input, lastUsedAt: new Date() },
  });
}
