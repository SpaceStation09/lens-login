import { CreateTestAccountEntry } from "@/components/create-test-account-entry";

export default function CreateTestAccountPage() {
  return (
    <main className="grid">
      <section className="card stack">
        <span className="pill">Temporary testnet tool</span>
        <h1>Create a Lens testnet account</h1>
        <p className="muted">
          Use MetaMask to create a simple Lens testnet account for testing this demo. This performs Lens onboarding login, uploads minimal account metadata to Grove, and submits account creation on Lens testnet.
        </p>
        <p className="muted">You need a wallet that can sign with MetaMask. The page will ask MetaMask to switch to Lens testnet.</p>
      </section>
      <section className="card stack">
        <CreateTestAccountEntry />
      </section>
    </main>
  );
}
