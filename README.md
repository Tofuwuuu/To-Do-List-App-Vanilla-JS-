# To-Do List App (Vanilla JS)
A to-do list app lets users add, mark, and remove tasks.

## Deploy on Render (Static Site)

1. In the Render dashboard, create a **Static Site** and connect this repo.
2. **Build command**: leave empty (no build step).
3. **Publish directory**: **`.`** (a single dot = repository root).

Do **not** set the publish directory to `index.html` — that must be a **folder** that contains your files, not the HTML file name. Render will serve `index.html` automatically from the root.

Optional: this repo includes [`render.yaml`](render.yaml) so a Blueprint deploy picks the correct `staticPublishPath` for you.
