import "server-only";
import type { CallModel } from "@/lib/recipes/generate";

/**
 * Appel à l'API Claude pour les recettes. Importable côté serveur uniquement (`server-only`) : la clé ne peut pas
 * fuiter dans le bundle navigateur. Aucun identifiant utilisateur ni profil n'est transmis : seulement `system` et `user`
 * construits par src/lib/recipes (voir prompt.ts).
 *
 * Le prompt système est envoyé en bloc avec `cache_control` : il est statique, donc mis en cache par le fournisseur
 * dès qu'il dépasse le seuil minimum du modèle (sinon la mention est sans effet et sans surcoût). Les compteurs
 * cache_read / cache_creation sont journalisés pour vérifier ce qu'il en est réellement.
 */
export const DEFAULT_RECIPE_MODEL = "claude-haiku-5-5";
const CALL_TIMEOUT_MS = 25_000;

export function recipeModel(env: Record<string, string | undefined> = process.env): string {
  return env.RECIPE_MODEL || DEFAULT_RECIPE_MODEL;
}

/**
 * Réflexion du modèle. Les modèles récents réfléchissent PAR DÉFAUT quand `thinking` est omis, et ces tokens cachés
 * consomment `max_tokens` : mesuré sur claude-haiku-5-5, 4 réponses sur 5 étaient coupées avant la fin du JSON.
 * Pour des recettes, la réflexion est inutile : on la désactive (valeur par défaut, valide pour Haiku 5.5) et on
 * demande un effort bas. Certains modèles refusent `disabled` (400 : Opus 5.5, Sonnet 5.5) : avec RECIPE_THINKING=on,
 * le champ est omis (le modèle réfléchit alors, à effort bas, et il faut relever RECIPE_MAX_TOKENS).
 */
export function thinkingParams(env: Record<string, string | undefined> = process.env): Record<string, unknown> {
  const effort = ["low", "medium", "high"].includes(env.RECIPE_EFFORT ?? "") ? env.RECIPE_EFFORT : "low";
  return {
    ...(env.RECIPE_THINKING === "on" ? {} : { thinking: { type: "disabled" } }),
    output_config: { effort },
  };
}

export function claudeCaller(env: Record<string, string | undefined> = process.env): CallModel {
  return async ({ system, user, maxTokens }) => {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CALL_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: recipeModel(env),
          max_tokens: maxTokens,
          ...thinkingParams(env),
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: user }],
        }),
        signal: ctl.signal,
        cache: "no-store",
      });
      if (!res.ok) return { ok: false }; // aucun détail renvoyé : ni statut, ni corps (pourrait refléter l'entrée)
      const data = (await res.json()) as {
        content?: { type?: string; text?: string }[];
        stop_reason?: string | null;
        usage?: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
      };
      const text = data.content?.find((c) => c.type === "text")?.text;
      if (typeof text !== "string") return { ok: false };
      const u = data.usage ?? {};
      return {
        ok: true,
        text,
        stopReason: data.stop_reason ?? null,
        usage: {
          inputTokens: u.input_tokens ?? 0,
          outputTokens: u.output_tokens ?? 0,
          cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
          cacheReadTokens: u.cache_read_input_tokens ?? 0,
        },
      };
    } catch {
      return { ok: false };
    } finally {
      clearTimeout(timer);
    }
  };
}
