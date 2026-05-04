function ErrorFallback({ error }: { error: Error }) {
  return (
    <div>
      <h1>Irgendwas ist schief gelaufen :/</h1>
      <p>{error.name}</p>
      <p>{error.message}</p>
      <p>{error.stack ?? ""}</p>
      <p>Bitte versuchen Sie es später erneut.</p>
    </div>
  );
}

export default ErrorFallback;
