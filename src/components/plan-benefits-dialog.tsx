"use client";

import { ClassroomButton, ClassroomDialogFrame } from "@/src/components/classroom";
import { SupportFacebookLink } from "@/src/components/support-facebook-link";
import { SUPPORT_FACEBOOK_NAME } from "@/src/auth/support-contact";
import type { LicensePlan } from "@/src/auth/types";
import { cn } from "@/lib/utils";
import {
  getPlanPresentation,
  getPublicComparisonPlans,
} from "@/src/app/settings/components/account-plan-display";

export function PlanBenefitsDialog({
  open,
  currentPlan,
  onClose,
}: {
  open: boolean;
  currentPlan: LicensePlan | string | undefined;
  onClose: () => void;
}) {
  const currentPresentation = getPlanPresentation(currentPlan);
  const comparisonPlans = getPublicComparisonPlans();
  const isLifetimeUser = currentPlan === "lifetime";

  return (
    <ClassroomDialogFrame
      open={open}
      onClose={onClose}
      ariaLabelledBy="plan-benefits-title"
      panelClassName="max-w-md"
      zIndexClassName="z-[100]"
    >
      <div className="w-full rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id="plan-benefits-title" className="font-display text-xl font-extrabold text-slate-800">
          Quyền lợi theo gói
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Nhắn Facebook {SUPPORT_FACEBOOK_NAME} để gia hạn hoặc nâng cấp Premium 1 năm.
        </p>

        {isLifetimeUser && currentPresentation ? (
          <div className="mt-4 rounded-2xl border border-brand/40 bg-brand-soft/40 px-4 py-3 text-sm font-semibold text-slate-800">
            <p className="font-extrabold">{currentPresentation.displayName}</p>
            <p className="mt-1 text-brand-dark">Gói hiện tại</p>
            <ul className="mt-2 space-y-1">
              {currentPresentation.featureBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="mt-4 space-y-2">
          {comparisonPlans.map((row) => {
            const isCurrent = !isLifetimeUser && row.id === currentPlan;
            return (
              <li
                key={row.id}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm font-semibold",
                  isCurrent
                    ? "border-brand/40 bg-brand-soft/40 text-slate-800"
                    : "border-sky-100 bg-surface-soft text-slate-600",
                )}
              >
                <p className="font-extrabold text-slate-800">
                  {row.displayName}
                  {isCurrent ? " — Gói hiện tại" : ""}
                </p>
                <ul className="mt-2 space-y-1">
                  {row.featureBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-col gap-3">
          <SupportFacebookLink />
          <ClassroomButton className="w-full" variant="outline" onClick={onClose}>
            Đã hiểu
          </ClassroomButton>
        </div>
      </div>
    </ClassroomDialogFrame>
  );
}
