type Example = {
  label: string;
  description: string;
  code: string;
};

declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom/client");
declare const mermaid: {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

const { useDeferredValue, useEffect, useId, useState, startTransition } = React;
const storageKey = "mermaid-viewer.source";

const examples: Example[] = [
  {
    label: "Flujo",
    description: "Proceso simple con decisiones.",
    code: `flowchart LR
    Inicio([Inicio]) --> Validar{Validar datos}
    Validar -->|OK| Guardar[Guardar pedido]
    Validar -->|Error| Corregir[Solicitar cambios]
    Guardar --> Notificar[Enviar confirmacion]
    Corregir --> Validar`,
  },
  {
    label: "Secuencia",
    description: "Conversacion cliente API.",
    code: `sequenceDiagram
    autonumber
    actor U as Usuario
    participant W as Web
    participant A as API
    participant D as DB

    U->>W: Crear diagrama
    W->>A: POST /render
    A->>D: Guardar metadata
    D-->>A: OK
    A-->>W: SVG listo
    W-->>U: Mostrar preview`,
  },
  {
    label: "Estados",
    description: "Estados de una solicitud.",
    code: `stateDiagram-v2
    [*] --> Borrador
    Borrador --> Revision
    Revision --> Aprobado
    Revision --> Rechazado
    Rechazado --> Borrador
    Aprobado --> Publicado
    Publicado --> [*]`,
  },
];

const starterDiagram = `flowchart TD
    A[Escribe Mermaid aqui] --> B{Vista previa en vivo}
    B -->|Valido| C[Render SVG]
    B -->|Con error| D[Mostrar mensaje]
    C --> E[Descargar resultado]`;

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "base",
  themeVariables: {
    primaryColor: "#f4efe6",
    primaryTextColor: "#14213d",
    primaryBorderColor: "#14213d",
    lineColor: "#14213d",
    secondaryColor: "#d7e3fc",
    tertiaryColor: "#fdecc8",
    fontFamily: "IBM Plex Sans, sans-serif",
  },
});

function downloadSvg(svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "diagram.svg";
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [source, setSource] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) || starterDiagram;
    } catch {
      return starterDiagram;
    }
  });
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [isRendering, setIsRendering] = useState(true);
  const deferredSource = useDeferredValue(source);
  const renderId = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setIsRendering(true);

      try {
        const { svg: renderedSvg } = await mermaid.render(
          `diagram-${renderId}`,
          deferredSource,
        );

        if (!cancelled) {
          setSvg(renderedSvg);
          setError("");
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : "No se pudo renderizar el diagrama.",
          );
          setSvg("");
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [deferredSource, renderId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, source);
    } catch {
      // Ignore storage errors so editing keeps working in restrictive contexts.
    }
  }, [source]);

  function loadExample(code: string) {
    startTransition(() => {
      setSource(code);
    });
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">React + TypeScript + Mermaid</p>
          <h1>Visualiza diagramas Mermaid en vivo</h1>
          <p className="hero-copy">
            Escribe, prueba y exporta diagramas desde una sola pantalla. La
            vista previa se actualiza automaticamente mientras editas.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className="secondary"
            type="button"
            onClick={() => loadExample(starterDiagram)}
          >
            Reiniciar ejemplo
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => downloadSvg(svg)}
            disabled={!svg}
          >
            Descargar SVG
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              startTransition(() => {
                setSource("");
              });
            }}
          >
            Limpiar editor
          </button>
        </div>
      </section>

      <section className="examples-panel">
        {examples.map((example) => (
          <button
            key={example.label}
            className="example-card"
            type="button"
            onClick={() => loadExample(example.code)}
          >
            <span>{example.label}</span>
            <small>{example.description}</small>
          </button>
        ))}
      </section>

      <section className="workspace">
        <article className="editor-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Editor</p>
              <h2>Codigo Mermaid</h2>
            </div>
            <span className="status-pill">{isRendering ? "Renderizando" : "Listo"}</span>
          </div>
          <p className="panel-help">
            El contenido se guarda localmente en tu navegador para que no pierdas el diagrama al recargar.
          </p>

          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            aria-label="Editor Mermaid"
          />
        </article>

        <article className="preview-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Preview</p>
              <h2>Salida SVG</h2>
            </div>
          </div>

          {error ? (
            <div className="feedback error">
              <strong>Error de sintaxis</strong>
              <p>{error}</p>
            </div>
          ) : (
            <div
              className="preview-canvas"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </article>
      </section>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
