import { useState } from "react";

import Button from "../../../components/ui/Button";
import TextField from "../../../components/ui/TextField";

export default function CreateProjectForm({
  loading,
  onSubmit,
  onClose,
}: {
  loading: boolean;
  onSubmit: (name: string, description: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("Enter a project name.");
      document.getElementById("project-name")?.focus();
      return;
    }

    void onSubmit(trimmedName, description.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6"
    >
      <div className="mb-5">
        <h2 className="text-base font-semibold text-zinc-900">
          Create a project
        </h2>

        <p className="mt-0.5 text-sm text-zinc-500">
          Projects keep your source code, snapshots and scans together.
        </p>
      </div>

      <div className="space-y-4">
        <TextField
          id="project-name"
          label="Project name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError("");
          }}
          placeholder="e.g. Payments API"
          autoComplete="off"
          autoFocus
          required
          disabled={loading}
          error={nameError}
        />

        <div>
          <label
            htmlFor="project-description"
            className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-zinc-700"
          >
            Description
            <span className="text-xs font-normal text-zinc-400">
              Optional
            </span>
          </label>

          <textarea
            id="project-description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does this project do?"
            rows={3}
            disabled={loading}
            className="block w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        <Button type="submit" loading={loading}>
          {loading ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}