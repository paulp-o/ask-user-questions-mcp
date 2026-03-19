import React from "react";
import type { SessionStatusValue } from "@auq/core";

type StatusBadgeProps = {
  status: SessionStatusValue;
};

const STATUS_STYLES: Record<SessionStatusValue, string> = {
  abandoned: "bg-slate-100 text-slate-700 border-slate-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  elaborate_requested: "bg-slate-100 text-slate-700 border-slate-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  rephrase_requested: "bg-slate-100 text-slate-700 border-slate-200",
  timed_out: "bg-slate-100 text-slate-700 border-slate-200",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
      aria-label={`Session status: ${status.replace("-", " ")}`}
    >
      {status.replace("-", " ")}
    </span>
  );
}