import { useState } from 'react';

interface CreateProjectFormProps {
  loading: boolean;
  onSubmit: (
    name: string,
    description: string,
  ) => Promise<void>;
  onClose: () => void;
}

export default function CreateProjectForm({
  loading,
  onSubmit,
  onClose,
}: CreateProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    await onSubmit(
      trimmedName,
      description.trim(),
    );
  }

  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Create a project
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Add a codebase to your VulnGuardian workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-2 py-1 text-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
        >
          ×
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label
            htmlFor="projectName"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Project name
          </label>

          <input
            id="projectName"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My secure application"
            maxLength={100}
            disabled={loading}
            autoFocus
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="projectDescription"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Description
          </label>

          <input
            id="projectDescription"
            type="text"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="What are you building?"
            maxLength={500}
            disabled={loading}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
          >
            {loading ? 'Creating...' : 'Create project'}
          </button>
        </div>
      </form>
    </section>
  );
}