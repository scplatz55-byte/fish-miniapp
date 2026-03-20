import { useEffect, useState } from "react";

type WeekdayRule = {
  id: string;
  day_of_week: number;
  is_enabled: boolean;
};

type WeekdayInterval = {
  id: string;
  weekday_rule_id: string;
  time_from: string;
  time_to: string;
  is_enabled: boolean;
  sort_order: number;
};

type DateOverride = {
  id: string;
  date: string;
  is_disabled: boolean | null;
};

type OverrideInterval = {
  id: string;
  override_id: string;
  time_from: string;
  time_to: string;
  is_enabled: boolean;
};

type PickupSetting = {
  id: string;
  title: string;
  address: string;
  worktime_text: string | null;
  is_active: boolean | null;
};

type AdminSlotsPanelProps = {
  inputStyle: React.CSSProperties;
  primaryButtonStyle: React.CSSProperties;
  ghostButtonStyle: React.CSSProperties;
  tabButtonStyle: (active: boolean) => React.CSSProperties;
  brandAccent: string;
  weekdayRules: WeekdayRule[];
  weekdayIntervals: WeekdayInterval[];
  overrides: DateOverride[];
  overrideIntervals: OverrideInterval[];
  pickupSettings: PickupSetting[];
  adminSlotsLoading: boolean;
  adminSlotsError: string | null;
  selectedOverrideDate: string;
  newIntervalDay: number | null;
  newIntervalFrom: string;
  newIntervalTo: string;
  newOverrideFrom: string;
  newOverrideTo: string;
  pickupSavingId?: string | null;
  onChangeSelectedOverrideDate: (value: string) => void;
  onChangeNewIntervalDay: (day: number | null) => void;
  onChangeNewIntervalFrom: (value: string) => void;
  onChangeNewIntervalTo: (value: string) => void;
  onChangeNewOverrideFrom: (value: string) => void;
  onChangeNewOverrideTo: (value: string) => void;
  onToggleWeekday: (ruleId: string, nextEnabled: boolean) => void;
  onToggleWeekdayInterval: (intervalId: string, nextEnabled: boolean) => void;
  onAddWeekdayInterval: () => void;
  onDeleteWeekdayInterval: (intervalId: string) => void;
  onToggleOverrideDayDisabled: () => void;
  onAddOverrideInterval: () => void;
  onToggleOverrideInterval: (intervalId: string, nextEnabled: boolean) => void;
  onDeleteOverrideInterval: (intervalId: string) => void;
  onUpdatePickupWorktime: (pickupId: string, worktimeText: string) => void | Promise<void>;
  renderSkeleton: (key: string) => React.ReactNode;
};

const WEEKDAY_LABELS = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
] as const;

function makeIntervalLabel(timeFrom: string, timeTo: string) {
  return `${timeFrom}–${timeTo}`;
}

export default function AdminSlotsPanel({
  inputStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  tabButtonStyle,
  brandAccent,
  weekdayRules,
  weekdayIntervals,
  overrides,
  overrideIntervals,
  pickupSettings,
  adminSlotsLoading,
  adminSlotsError,
  selectedOverrideDate,
  newIntervalDay,
  newIntervalFrom,
  newIntervalTo,
  newOverrideFrom,
  newOverrideTo,
  pickupSavingId = null,
  onChangeSelectedOverrideDate,
  onChangeNewIntervalDay,
  onChangeNewIntervalFrom,
  onChangeNewIntervalTo,
  onChangeNewOverrideFrom,
  onChangeNewOverrideTo,
  onToggleWeekday,
  onToggleWeekdayInterval,
  onAddWeekdayInterval,
  onDeleteWeekdayInterval,
  onToggleOverrideDayDisabled,
  onAddOverrideInterval,
  onToggleOverrideInterval,
  onDeleteOverrideInterval,
  onUpdatePickupWorktime,
  renderSkeleton,
}: AdminSlotsPanelProps) {
  const [pickupDrafts, setPickupDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    pickupSettings.forEach((point) => {
      nextDrafts[point.id] = point.worktime_text || "";
    });
    setPickupDrafts(nextDrafts);
  }, [pickupSettings]);

  const intervalsByRuleId = new Map<string, WeekdayInterval[]>();
  weekdayIntervals.forEach((interval) => {
    const list = intervalsByRuleId.get(interval.weekday_rule_id) || [];
    list.push(interval);
    intervalsByRuleId.set(interval.weekday_rule_id, list);
  });
  intervalsByRuleId.forEach((list) => {
    list.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      if (a.time_from !== b.time_from) return a.time_from.localeCompare(b.time_from);
      return a.time_to.localeCompare(b.time_to);
    });
  });

  const selectedOverride = overrides.find((item) => item.date === selectedOverrideDate) || null;
  const selectedOverrideIntervals = selectedOverride
    ? overrideIntervals.filter((item) => item.override_id === selectedOverride.id)
    : [];

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Расписание доставки</div>
      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.76 }}>
        Настрой шаблон по дням недели. Он будет повторяться автоматически из недели в неделю.
      </div>

      {adminSlotsLoading ? (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {renderSkeleton("weekday-1")}
          {renderSkeleton("weekday-2")}
          {renderSkeleton("weekday-3")}
        </div>
      ) : adminSlotsError ? (
        <div style={{ marginTop: 12, color: brandAccent, whiteSpace: "pre-wrap" }}>
          Ошибка: {adminSlotsError}
        </div>
      ) : (
        <>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {weekdayRules
              .slice()
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((rule) => {
                const intervals = intervalsByRuleId.get(rule.id) || [];
                const isSelectedDay = newIntervalDay === rule.day_of_week;

                return (
                  <div
                    key={rule.id}
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(10,19,23,0.08)",
                      background: "rgba(255,255,255,0.96)",
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15 }}>
                          {WEEKDAY_LABELS[rule.day_of_week]}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.76 }}>
                          {rule.is_enabled
                            ? "День участвует в автоматическом расписании"
                            : "День выключен"}
                        </div>
                      </div>

                      <button
                        type="button"
                        style={tabButtonStyle(rule.is_enabled)}
                        onClick={() => onToggleWeekday(rule.id, !rule.is_enabled)}
                      >
                        {rule.is_enabled ? "Вкл" : "Выкл"}
                      </button>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {intervals.length > 0 ? (
                        intervals.map((interval) => (
                          <div
                            key={interval.id}
                            style={{
                              borderRadius: 12,
                              border: "1px solid rgba(10,19,23,0.08)",
                              background: interval.is_enabled
                                ? "rgba(10,19,23,0.03)"
                                : "rgba(10,19,23,0.02)",
                              padding: 10,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ fontWeight: 900, fontSize: 14 }}>
                              {makeIntervalLabel(interval.time_from, interval.time_to)}
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                style={tabButtonStyle(interval.is_enabled)}
                                onClick={() =>
                                  onToggleWeekdayInterval(interval.id, !interval.is_enabled)
                                }
                              >
                                {interval.is_enabled ? "Вкл" : "Выкл"}
                              </button>
                              <button
                                type="button"
                                style={ghostButtonStyle}
                                onClick={() => onDeleteWeekdayInterval(interval.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 13, opacity: 0.72 }}>
                          Для этого дня интервалы пока не добавлены.
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
                        gap: 8,
                      }}
                    >
                      <input
                        style={{
                          ...inputStyle,
                          borderColor: isSelectedDay ? "rgba(212,51,20,0.30)" : undefined,
                        }}
                        type="time"
                        value={isSelectedDay ? newIntervalFrom : ""}
                        onFocus={() => onChangeNewIntervalDay(rule.day_of_week)}
                        onChange={(e) => {
                          onChangeNewIntervalDay(rule.day_of_week);
                          onChangeNewIntervalFrom(e.target.value);
                        }}
                      />
                      <input
                        style={{
                          ...inputStyle,
                          borderColor: isSelectedDay ? "rgba(212,51,20,0.30)" : undefined,
                        }}
                        type="time"
                        value={isSelectedDay ? newIntervalTo : ""}
                        onFocus={() => onChangeNewIntervalDay(rule.day_of_week)}
                        onChange={(e) => {
                          onChangeNewIntervalDay(rule.day_of_week);
                          onChangeNewIntervalTo(e.target.value);
                        }}
                      />
                      <button
                        type="button"
                        style={primaryButtonStyle}
                        onClick={() => {
                          onChangeNewIntervalDay(rule.day_of_week);
                          onAddWeekdayInterval();
                        }}
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div
            style={{
              marginTop: 16,
              borderRadius: 16,
              border: "1px solid rgba(10,19,23,0.08)",
              background: "rgba(255,255,255,0.96)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 15 }}>Исключения по конкретной дате</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.76 }}>
              Здесь можно временно отключить весь день или задать особые интервалы для одной даты.
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <input
                style={inputStyle}
                type="date"
                value={selectedOverrideDate}
                onChange={(e) => onChangeSelectedOverrideDate(e.target.value)}
              />

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={tabButtonStyle(Boolean(selectedOverride?.is_disabled))}
                  onClick={onToggleOverrideDayDisabled}
                  disabled={!selectedOverrideDate}
                >
                  {selectedOverride?.is_disabled ? "День отключён" : "Отключить день"}
                </button>
                {selectedOverride && (
                  <div style={{ fontSize: 13, opacity: 0.76 }}>
                    Override уже создан для {selectedOverride.date}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
                  gap: 8,
                }}
              >
                <input
                  style={inputStyle}
                  type="time"
                  value={newOverrideFrom}
                  onChange={(e) => onChangeNewOverrideFrom(e.target.value)}
                />
                <input
                  style={inputStyle}
                  type="time"
                  value={newOverrideTo}
                  onChange={(e) => onChangeNewOverrideTo(e.target.value)}
                />
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={onAddOverrideInterval}
                  disabled={!selectedOverrideDate}
                >
                  Добавить
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedOverrideDate ? (
                selectedOverrideIntervals.length > 0 ? (
                  selectedOverrideIntervals.map((interval) => (
                    <div
                      key={interval.id}
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(10,19,23,0.08)",
                        background: interval.is_enabled
                          ? "rgba(10,19,23,0.03)"
                          : "rgba(10,19,23,0.02)",
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: 14 }}>
                        {makeIntervalLabel(interval.time_from, interval.time_to)}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          style={tabButtonStyle(interval.is_enabled)}
                          onClick={() =>
                            onToggleOverrideInterval(interval.id, !interval.is_enabled)
                          }
                        >
                          {interval.is_enabled ? "Вкл" : "Выкл"}
                        </button>
                        <button
                          type="button"
                          style={ghostButtonStyle}
                          onClick={() => onDeleteOverrideInterval(interval.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, opacity: 0.72 }}>
                    Для выбранной даты пока нет специальных интервалов.
                  </div>
                )
              ) : (
                <div style={{ fontSize: 13, opacity: 0.72 }}>
                  Выбери дату, чтобы настроить исключение.
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              borderRadius: 16,
              border: "1px solid rgba(10,19,23,0.08)",
              background: "rgba(255,255,255,0.96)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 15 }}>Самовывоз</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.76 }}>
              Здесь можно редактировать текст режима работы для каждой точки.
            </div>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {pickupSettings.map((point) => {
                const draft = pickupDrafts[point.id] ?? point.worktime_text ?? "";
                const saving = pickupSavingId === point.id;

                return (
                  <div
                    key={point.id}
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(10,19,23,0.08)",
                      background: "rgba(10,19,23,0.03)",
                      padding: 10,
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 14 }}>{point.title}</div>
                    <div style={{ marginTop: 4, fontSize: 13, opacity: 0.78 }}>{point.address}</div>

                    <textarea
                      style={{
                        ...inputStyle,
                        width: "100%",
                        boxSizing: "border-box",
                        minHeight: 84,
                        marginTop: 10,
                        resize: "vertical",
                      }}
                      placeholder="Например: Режим работы магазина: 9:00–21:00 ежедневно."
                      value={draft}
                      onChange={(e) =>
                        setPickupDrafts((prev) => ({
                          ...prev,
                          [point.id]: e.target.value,
                        }))
                      }
                    />

                    <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        style={{
                          ...primaryButtonStyle,
                          opacity: saving ? 0.7 : 1,
                        }}
                        onClick={() => onUpdatePickupWorktime(point.id, draft)}
                        disabled={saving}
                      >
                        {saving ? "Сохраняем..." : "Сохранить текст"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {pickupSettings.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.72 }}>Точки самовывоза не найдены.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
