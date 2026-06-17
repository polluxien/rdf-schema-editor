export default function Home() {
  return (
    <main>
      <h1>RDF Schema Editor API</h1>
      <p>API is running. Available endpoints:</p>
      <ul>
        <li>POST/GET/DELETE /api/login</li>
        <li>GET/POST /api/workspaces</li>
        <li>GET/PUT/DELETE /api/workspaces/[id]</li>
      </ul>
    </main>
  );
}
