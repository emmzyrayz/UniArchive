// GET /api/admin/surveys/[id]/export?format=csv|json&<results filters>
// Every matching response, one row (CSV) or object (JSON) each, answers as
// readable text with a column per question. Streamed in batches, so large
// surveys don't sit in memory. CSV opens straight in Excel (UTF-8 BOM,
// formula-looking cells defused). Permission: "survey.manage".
import { type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getSurveyModel, type ISurvey } from "@/lib/models/surveyModel";
import { getSurveyResponseModel, type ISurveyResponse } from "@/lib/models/surveyResponseModel";
import { exportCsvHeader, exportCsvRow, exportJsonRow, parseFilters, responseMatch, toResponseRows } from "@/lib/survey/analysis";

export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };
const BATCH = 500;
// Byte-order mark: tells Excel the CSV is UTF-8
const BOM = String.fromCharCode(0xfeff);

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "survey.manage");
    await enforceRateLimit(request, "surveyExport", `survey-export:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Survey not found.");
    const format = request.nextUrl.searchParams.get("format") ?? "csv";
    if (format !== "csv" && format !== "json") return fail(400, 'format must be "csv" or "json".');
    const survey = await (await getSurveyModel()).findById(id).lean<ISurvey>();
    if (!survey) return fail(404, "Survey not found.");

    const match = responseMatch(survey, parseFilters(request.nextUrl.searchParams));
    const Responses = await getSurveyResponseModel();
    const encoder = new TextEncoder();
    const questions = survey.questions;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (s: string) => controller.enqueue(encoder.encode(s));
        try {
          write(format === "csv" ? `${BOM}${exportCsvHeader(questions)}\r\n` : `{"survey":${JSON.stringify({ id: String(survey._id), slug: survey.slug, title: survey.title, questions })},"exportedAt":${JSON.stringify(new Date().toISOString())},"responses":[`);
          let first = true;
          let lastId: unknown = null;
          // Keyset pages by _id: stable while new answers keep arriving
          for (;;) {
            const docs = await Responses.find(lastId ? { ...match, _id: { $gt: lastId } } : match)
              .sort({ _id: 1 })
              .limit(BATCH)
              .lean<ISurveyResponse[]>();
            if (docs.length === 0) break;
            lastId = docs[docs.length - 1]._id;
            for (const row of await toResponseRows(docs)) {
              if (format === "csv") write(`${exportCsvRow(questions, row)}\r\n`);
              else {
                write(`${first ? "" : ","}${JSON.stringify(exportJsonRow(questions, row))}`);
                first = false;
              }
            }
            if (docs.length < BATCH) break;
          }
          if (format === "json") write("]}");
          controller.close();
        } catch (error) {
          console.error("Survey export failed:", error);
          controller.error(error);
        }
      },
    });

    const day = new Date().toISOString().slice(0, 10);
    return new Response(stream, {
      headers: {
        "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${survey.slug}-responses-${day}.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/surveys/[id]/export");
  }
}
