/* The passages a document answer stood on.
 *
 * Document Q&A's workflow is retrieval, so its equivalent of a score is evidence:
 * the answer cites [1], [2] inline and these are the passages behind those
 * markers. Collapsed by default — the answer is the point, the receipts are there
 * for when you doubt it. <details> rather than state, so it survives a re-render
 * of the thread without the panel snapping shut.
 */
export default function Sources({ sources }) {
  if (!sources?.length) return null

  return (
    <details className="h2c-sources">
      <summary>
        Grounded in {sources.length} passage{sources.length === 1 ? '' : 's'}
      </summary>
      <ol className="h2c-sources__list">
        {sources.map((s) => (
          <li key={`${s.documentId}-${s.chunkIndex}`}>
            <span className="h2c-sources__marker">[{s.marker}]</span>
            <span className="h2c-sources__excerpt">{s.excerpt}</span>
            {/* cosine similarity, so it reads as "how close this passage was" */}
            <span className="h2c-sources__score">{Math.round(s.relevance * 100)}%</span>
          </li>
        ))}
      </ol>
    </details>
  )
}
