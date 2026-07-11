import { GoogleGenAI, Type } from '@google/genai'

// Lazy Gemini client. The API key is runtime-only (Netlify env); the gate runs
// with it unset, so construction is deferred to call-time, not import-time.
export function gemini(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

// Structured-output schema for the preparedness plan. Field names mirror the
// `PreparednessPlan` / `LocationPlan` / `PlanChecklistItem` types so the parsed
// JSON is assignable. `PlanChecklistItem.done` is intentionally omitted — it is
// client-only state (defaults to false in <Checklist/>) and the model need not
// produce it. See src/lib/types.ts.
export const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: { type: Type.STRING },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          locationName: { type: Type.STRING },
          summary: { type: Type.STRING },
          immediate: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING }, label: { type: Type.STRING } },
              required: ['id', 'label'],
            },
          },
          supplies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING }, label: { type: Type.STRING } },
              required: ['id', 'label'],
            },
          },
          evacuation: { type: Type.STRING },
        },
        required: ['locationName', 'summary', 'immediate', 'supplies', 'evacuation'],
      },
    },
  },
  required: ['overview', 'locations'],
}
