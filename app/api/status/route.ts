import { env } from "cloudflare:workers";

export async function GET() {
  const submissions = await env.DB.prepare(`
    SELECT s.id, s.department, s.provider, s.project_type AS type, s.payment_period AS periodDeadline,
           s.waiting_for_period AS waitingForPeriod,
           s.project, s.comment, s.status, s.created_at AS createdAt, COUNT(d.id) AS files
    FROM submissions s
    LEFT JOIN documents d ON d.submission_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 500
  `).all();
  const documents = await env.DB.prepare(`
    SELECT id, submission_id AS submissionId, file_name AS fileName, size
    FROM documents
    ORDER BY created_at
  `).all();
  return Response.json({ submissions: submissions.results, documents: documents.results });
}
