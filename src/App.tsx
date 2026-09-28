import mioRequest from '../vendor/performance-contract/v0/examples/request.json';
import upstream from '../vendor/performance-contract/UPSTREAM.json';
import { validatePerformanceRequest } from './contract/validation';

export default function App() {
  const validation = validatePerformanceRequest(mioRequest);
  const character = mioRequest.character;

  return (
    <main className="shell">
      <section className="card" aria-labelledby="title">
        <p className="eyebrow">Performance Studio · bootstrap</p>
        <h1 id="title">{character.name}</h1>
        <p className="description">{character.description}</p>

        <dl className="status-grid">
          <div>
            <dt>Contract</dt>
            <dd>{mioRequest.schema_version}</dd>
          </div>
          <div>
            <dt>Fixture validation</dt>
            <dd>{validation.ok ? 'VALID' : 'INVALID'}</dd>
          </div>
          <div>
            <dt>Upstream</dt>
            <dd><code>{upstream.commit.slice(0, 12)}</code></dd>
          </div>
        </dl>

        {!validation.ok && (
          <pre className="errors">{validation.issues.join('\n')}</pre>
        )}

        <p className="boundary">
          This screen proves the versioned creative contract can be loaded and validated.
          It does not synthesize audio or expose physical solver controls.
        </p>
      </section>
    </main>
  );
}
