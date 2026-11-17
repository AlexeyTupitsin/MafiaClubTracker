import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { EmptyState, Select } from "../components/ui";
import { calcPlayerStats, calcExtendedNominations, calcKillRate, calcThreshold } from "../lib/metrics";
import { NOMINATION_CONFIG, ROLE_NAMES } from "../lib/constants";
import { RatingTable } from "../components/RatingTable";
import { NominationList } from "../components/NominationList";
import { signedClass, winrateClass } from "../lib/utils";
import { ShareImageButton } from "../components/share/ShareImageButton";
import { renderRatingCard } from "../lib/shareImage/ratingCard";
import { useHashParam, boolParam } from "../hooks/useHashParam";

export function Leaderboard({ games, players, seasons, currentSeasonId, navigate, allGames, showToast }) {
  // Фильтры и сортировка — в адресе: «назад» из профиля игрока их не сбрасывает.
  // Период не задан — сезон из бокового меню; «all» — все сезоны.
  const [seasonParam, setSeasonParam] = useHashParam("season", null);
  const [roleFilter, setRoleFilter] = useHashParam("role", "all");
  const [minGamesInput, setMinGamesInput] = useHashParam("min", "");
  const [sortCol, setSortCol] = useHashParam("sort", "avgScore");
  const [sortDir, setSortDir] = useHashParam("dir", "desc");
  const [showAll, setShowAll] = useHashParam("below", false, boolParam);

  const seasonFilter = seasonParam ?? currentSeasonId ?? "all";
  const setSeasonFilter = (v) => setSeasonParam(v === currentSeasonId ? null : v);

  // Determine active game set
  const activeGames = useMemo(() => {
    if (seasonFilter === "all") return allGames;
    if (seasonFilter === currentSeasonId) return games;
    return allGames.filter((g) => g.seasonId === seasonFilter);
  }, [seasonFilter, games, currentSeasonId, allGames]);

  const selectedSeason = useMemo(() => {
    if (seasonFilter === "all") return null;
    return seasons.find((s) => s.id === seasonFilter) || null;
  }, [seasonFilter, seasons]);

  // Build rating data
  const ratingCalc = useMemo(() => {
    const playerIds = new Set();
    activeGames.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));

    const totalGamesInPeriod = activeGames.length;
    const minGames = roleFilter !== "all" ? 0 : calcThreshold(selectedSeason, totalGamesInPeriod);

    // ELO сквозной по всем сезонам — берём текущее значение игрока.
    // Дельта, наоборот, считается только по отфильтрованным играм.
    const sumEloDelta = (entries) =>
      entries.reduce((sum, p) => sum + (p.eloDelta ?? 0), 0);

    const all = Array.from(playerIds).flatMap((pid) => {
      const player = players.find((p) => p.id === pid);

      if (roleFilter !== "all") {
        const roleEntries = activeGames.flatMap((g) =>
          g.players.filter((p) => p.playerId === pid && p.role === roleFilter)
        );
        if (roleEntries.length === 0) return [];
        const wins = roleEntries.filter((p) => p.result === "win").length;
        const totalScore = roleEntries.reduce((sum, p) => sum + p.totalScore, 0);
        const totalBonus = roleEntries.reduce((sum, p) => sum + p.bonusScore, 0);
        return [{
          id: pid,
          nickname: player?.nickname || "?",
          avatarUrl: player?.avatarUrl,
          totalGames: roleEntries.length,
          wins,
          draws: roleEntries.filter((p) => p.result === "draw").length,
          losses: roleEntries.filter((p) => p.result === "lose").length,
          winrate: (wins / roleEntries.length) * 100,
          totalScore,
          avgScore: totalScore / roleEntries.length,
          totalBonus,
          avgBonus: totalBonus / roleEntries.length,
          elo: player?.elo ?? null,
          eloDelta: Math.round(sumEloDelta(roleEntries)),
          killRate: null,
        }];
      }

      const stats = calcPlayerStats(pid, activeGames);
      const kr = calcKillRate(pid, activeGames, seasons);
      const entries = activeGames.flatMap((g) => g.players.filter((p) => p.playerId === pid));
      return [{
        id: pid,
        nickname: player?.nickname || "?",
        avatarUrl: player?.avatarUrl,
        ...stats,
        elo: player?.elo ?? null,
        eloDelta: Math.round(sumEloDelta(entries)),
        killRate: kr,
      }];
    });

    return { all, minGames, totalGamesInPeriod };
  }, [activeGames, players, selectedSeason, roleFilter, seasons]);

  const minGamesFilter = parseInt(minGamesInput, 10) || 0;

  const ratingData = useMemo(() => {
    let data = showAll ? ratingCalc.all : ratingCalc.all.filter((p) => p.totalGames >= ratingCalc.minGames);
    if (minGamesFilter > 0) data = data.filter((p) => p.totalGames >= minGamesFilter);
    return data;
  }, [ratingCalc, showAll, minGamesFilter]);

  const belowThreshold = useMemo(() => {
    if (showAll) return [];
    return ratingCalc.all.filter((p) => p.totalGames < ratingCalc.minGames);
  }, [ratingCalc, showAll]);

  const { nominations: extNominations } = useMemo(
    () => calcExtendedNominations(activeGames, players),
    [activeGames, players]
  );

  const filteredNominations = useMemo(() => {
    const result = {};
    if (showAll || ratingCalc.minGames === 0) {
      for (const { role } of NOMINATION_CONFIG) {
        result[role] = (extNominations[role] || []).slice(0, 5);
      }
      return result;
    }
    const eligibleIds = new Set(
      ratingCalc.all.filter((p) => p.totalGames >= ratingCalc.minGames).map((p) => p.id)
    );
    for (const { role } of NOMINATION_CONFIG) {
      result[role] = (extNominations[role] || []).filter((p) => eligibleIds.has(p.playerId)).slice(0, 5);
    }
    return result;
  }, [extNominations, ratingCalc, showAll]);

  // Sort
  const sorted = useMemo(() => {
    return [...ratingData].sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (typeof va === "string") {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [ratingData, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const fmtSigned = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
  const columns = [
    { key: "nickname", label: "Ник", sortable: true },
    { key: "totalGames", label: "Игры", sortable: true },
    { key: "wins", label: "Победы", sortable: true },
    { key: "winrate", label: "WR", sortable: true, title: "Процент побед",
      render: (r) => <span className={winrateClass(r.winrate)}>{r.winrate.toFixed(0)}%</span> },
    { key: "totalScore", label: "Баллы", sortable: true,
      render: (r) => (r.totalScore % 1 === 0 ? r.totalScore : r.totalScore.toFixed(1)) },
    { key: "avgScore", label: "Ср. балл", sortable: true, title: "Средний балл за игру", render: (r) => r.avgScore.toFixed(2) },
    { key: "avgBonus", label: "Ср. доп.", sortable: true, title: "Средний дополнительный балл",
      render: (r) => <span className={signedClass(r.avgBonus)}>{fmtSigned(r.avgBonus)}</span> },
    { key: "elo", label: "ELO", sortable: true, title: "Рейтинг ELO. Сквозной по всем сезонам — фильтр периода на него не влияет. Изменение рядом показано за выбранный период",
      render: (r) => r.elo == null ? <span className="text-stone-600">—</span> : (
        <span className="inline-flex items-baseline gap-1.5">
          <span>{Math.round(r.elo)}</span>
          <span className={`text-xs w-9 text-left ${r.eloDelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {r.eloDelta !== 0 && `${r.eloDelta > 0 ? "+" : "−"}${Math.abs(r.eloDelta)}`}
          </span>
        </span>
      ) },
    ...(roleFilter === "all" ? [{ key: "killRate", label: "ПУ", sortable: false, title: "Процент первых убийств",
      render: (r) => (r.killRate ? `${r.killRate.killRate.toFixed(0)}%` : <span className="text-stone-600">—</span>) }] : []),
  ];

  const renderShareImage = () => {
    const sortColumn = columns.find((c) => c.key === sortCol);
    return renderRatingCard({
      periodName: selectedSeason?.name ?? "Все сезоны",
      roleName: roleFilter === "all" ? null : ROLE_NAMES[roleFilter],
      totalGames: ratingCalc.totalGamesInPeriod,
      minGames: Math.max(showAll ? 0 : ratingCalc.minGames, minGamesFilter),
      sortLabel: sortColumn ? `${sortColumn.label} ${sortDir === "asc" ? "↑" : "↓"}` : null,
      rows: sorted.slice(0, 15).map((row) => ({
        ...row,
        avatarUrl: players.find((p) => p.id === row.id)?.avatarUrl ?? null,
      })),
    });
  };

  const segBtn = (active) =>
    `h-8 px-3 rounded-md text-sm font-medium whitespace-nowrap cursor-pointer ${
      active ? "bg-elev-3 text-stone-50 shadow-sm shadow-black/40" : "text-stone-400 hover:text-stone-100"
    }`;

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{selectedSeason?.name ?? "Все сезоны"}</p>
          <h2 className="page-title mt-1.5">Рейтинг</h2>
        </div>
        {sorted.length > 0 && (
          <ShareImageButton
            render={renderShareImage}
            fileName={`iron-maf-rating-${new Date().toISOString().slice(0, 10)}.png`}
            title="Рейтинг"
            showToast={showToast}
          />
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        <Select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} aria-label="Период" wrapperClassName="w-full sm:w-fit" className="sm:!w-auto sm:min-w-[9rem]">
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <input
          type="number" inputMode="numeric" min={1}
          value={minGamesInput}
          onChange={(e) => setMinGamesInput(e.target.value)}
          placeholder="Игр от…"
          aria-label="Минимум игр"
          className="input !w-28"
        />
        <div className="flex gap-0.5 bg-elev-2 border border-line-strong rounded-[10px] p-0.5 overflow-x-auto max-w-full" role="group" aria-label="Роль">
          <button onClick={() => setRoleFilter("all")} aria-pressed={roleFilter === "all"} className={segBtn(roleFilter === "all")}>Все роли</button>
          {Object.entries(ROLE_NAMES).map(([role, name]) => (
            <button key={role} onClick={() => setRoleFilter(role)} aria-pressed={roleFilter === role} className={segBtn(roleFilter === role)}>{name}</button>
          ))}
        </div>
      </div>

      {ratingCalc.minGames > 0 && ratingCalc.totalGamesInPeriod > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-stone-400">
            {selectedSeason?.ratingThresholdType === 'percent'
              ? `Порог: ${ratingCalc.minGames} из ${ratingCalc.totalGamesInPeriod} игр (${selectedSeason.ratingThresholdValue}%)`
              : `Порог: минимум ${ratingCalc.minGames} игр`}
            {!showAll && belowThreshold.length > 0 && (
              <span className="text-stone-500"> · {belowThreshold.length} игрок{belowThreshold.length > 4 ? "ов" : belowThreshold.length > 1 ? "а" : ""} ниже порога</span>
            )}
          </span>
          <button onClick={() => setShowAll(!showAll)} className="h-9 px-3 -mr-3 rounded-lg text-accent-300 hover:bg-elev-2 font-medium whitespace-nowrap cursor-pointer">
            {showAll ? "Только прошедшие порог" : "Показать всех"}
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Пока нет данных для рейтинга"
          description="Добавьте игры, чтобы увидеть рейтинг игроков"
        />
      ) : (
        <div className="card overflow-hidden">
          <RatingTable rows={sorted} columns={columns} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} navigate={navigate} stickyHeader />
        </div>
      )}

      {activeGames.length > 0 && (
        <section className="pt-4" aria-labelledby="lb-nom-title">
          <h3 id="lb-nom-title" className="font-display text-base font-bold text-stone-50 mb-3">Номинации</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {NOMINATION_CONFIG.map(({ role, icon, label }) => (
              <NominationList key={role} role={role} icon={icon} label={label}
                top={filteredNominations[role] || []} navigate={navigate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
