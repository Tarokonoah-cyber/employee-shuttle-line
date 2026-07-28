"use client";

import { FieldLabel } from "@/components/ui";
import { registrationDeadlineFromRule, taipeiDateTimeShort } from "@/lib/dates";

const departurePresets = ["14:00", "16:00"];
const cutoffPresets = ["20:00", "22:00"];

function TimePresets({
  value,
  values,
  onChange,
}: {
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2" aria-label="常用時間">
      {values.map((time) => (
        <button
          key={time}
          type="button"
          className={`rounded-full border px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
            value === time
              ? "border-primary bg-primary text-white"
              : "border-border bg-white text-stone-700 hover:border-primary hover:text-primary"
          }`}
          onClick={() => onChange(time)}
        >
          {time}
        </button>
      ))}
    </div>
  );
}

export function DepartureTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel label="發車時間" required>
        <input
          className="field"
          type="time"
          step={300}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
      </FieldLabel>
      <TimePresets value={value} values={departurePresets} onChange={onChange} />
    </div>
  );
}

export function RegistrationDeadlineFields({
  serviceDate,
  dayOffset,
  time,
  onDayOffsetChange,
  onTimeChange,
}: {
  serviceDate?: string;
  dayOffset: number;
  time: string;
  onDayOffsetChange: (value: number) => void;
  onTimeChange: (value: string) => void;
}) {
  let preview = dayOffset === 1 ? `發車前一天 ${time}` : `發車當日 ${time}`;
  if (serviceDate) {
    try {
      preview = taipeiDateTimeShort(registrationDeadlineFromRule(serviceDate, dayOffset, time));
    } catch {
      preview = "請選擇完整截止時間";
    }
  }

  return (
    <section className="rounded-[9px] border border-emerald-900/15 bg-emerald-50/60 p-4">
      <div>
        <h3 className="font-bold text-emerald-950">報名／取消截止</h3>
        <p className="mt-1 text-xs leading-5 text-emerald-900/70">
          預設為發車前一天 20:00；截止後員工不能再報名或自行取消。
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FieldLabel label="截止日期" required>
          <select
            className="field"
            value={dayOffset}
            onChange={(event) => onDayOffsetChange(Number(event.target.value))}
          >
            <option value={1}>發車前一天</option>
            <option value={0}>發車當日</option>
          </select>
        </FieldLabel>
        <div>
          <FieldLabel label="截止時間" required>
            <input
              className="field"
              type="time"
              step={300}
              value={time}
              onChange={(event) => onTimeChange(event.target.value)}
              required
            />
          </FieldLabel>
          <TimePresets value={time} values={cutoffPresets} onChange={onTimeChange} />
        </div>
      </div>
      <p className="mt-4 rounded-[7px] bg-white/80 px-3 py-2 text-sm text-emerald-950">
        實際截止：<strong>{preview}</strong>
      </p>
    </section>
  );
}
