# SoundBoard - Collaborative Music Creation Platform

SoundBoard is a web-based application designed for real-time collaborative music creation. It allows users to create jam rooms, record audio loops, and build musical pieces together.

## Core Concept

Create. Loop. Jam. Together.

SoundBoard provides virtual spaces (Jam Rooms) where musicians can record and layer audio loops in sync. It focuses on simplicity and real-time interaction (though full real-time sync needs further development).

## Features

- **Authentication:** Secure user sign-up and login using Supabase Auth (Email/Password).
- **Dashboard:**
  - View personal Jam Rooms (hosted by the user).
  - View public Jam Rooms available to join.
  - Create new Jam Rooms with specified Title, BPM, musical Key, and Privacy settings.
- **Jam Rooms:**
  - **Room Settings:** View BPM and Key. Hosts can toggle room privacy (Public/Private).
  - **Recording:** Record audio loops directly in the browser using the Web Audio API (`MediaRecorder`).
  - **Track Playback:** Play individual recorded tracks/loops.
  - **Synchronized Playback:** Play all tracks in the room simultaneously using the "Play All" button.
  - **Volume/Mute Control:** Adjust volume or mute individual tracks.
  - **Looping:** Toggle looping for individual tracks.
  - **Visualizers:** Each track item displays a waveform visualizer that animates during playback.
  - **Mix Export:** Export a mixdown of all tracks in the room as a `.wav` file. The export respects the individual gain levels set for each track.
  - **Sharing:** Copy room code or a direct link to share. Private rooms are accessible only via the direct link for logged-in users.
  - **Track Deletion:** Users can delete their own tracks. Room hosts can delete any track within their room.
  - **Room Deletion:** Room hosts can permanently delete their Jam Room, which also removes all associated tracks and their audio files from storage.
- **Profile Page:**
  - View user statistics (e.g., number of rooms hosted, loops recorded).
  - View recent activity feed (e.g., room creation, track recording).

## Tech Stack

- **Frontend:**
  - [React](https://reactjs.org/) (with Vite)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [Shadcn UI](https://ui.shadcn.com/) (Component library)
  - [Lucide React](https://lucide.dev/) (Icons)
  - [React Router DOM](https://reactrouter.com/) (Routing)
  - [date-fns](https://date-fns.org/) (Date formatting)
- **Backend & Infrastructure:**
  - [Supabase](https://supabase.io/)
    - Authentication
    - PostgreSQL Database (for rooms, tracks, profiles)
    - Storage (for audio files)
    - Row Level Security (RLS) for data access control
- **Audio Processing:**
  - [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (including `AudioContext`, `MediaRecorder`, `OfflineAudioContext` for mixing)

## Project Setup

1.  **Clone the Repository:**

    ```bash
    git clone <YOUR_REPOSITORY_URL>
    cd soundwave-jam-session
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Supabase Setup:**

    - Create a new project on [Supabase](https://supabase.io/).
    - **Database:**
      - Use the SQL editor in your Supabase project dashboard to create the required tables (`profiles`, `jam_rooms`, `tracks`). Refer to `src/types/database.ts` or inspect Supabase hook functions (`src/hooks/useSupabase.ts`) for schema details.
      - Set up Foreign Key relationships (e.g., `jam_rooms.host_id` -> `profiles.id`, `tracks.jam_room_id` -> `jam_rooms.id`, `tracks.creator_id` -> `profiles.id`).
      - Enable Row Level Security (RLS) on all tables.
      - Add the necessary RLS policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` on each table based on the application logic (refer to conversation history or inspect Supabase hook interactions if unsure). **Crucially, ensure policies allow hosts to delete rooms and associated tracks, and allow authenticated users with a link to access private rooms and their tracks.**
    - **Authentication:**
      - Enable the Email provider.
      - (Optional) Configure other providers if needed.
      - Disable "Confirm email" if you want users to log in immediately after signup, otherwise ensure your app handles email confirmation.
    - **Storage:**
      - Create a public bucket named `audio`.
      - Set up Storage access policies (e.g., allow authenticated users to upload to their designated paths, allow public reads if necessary for track playback, allow authenticated users/hosts to delete based on paths).
    - **Environment Variables:**
      - Create a `.env` file in the root of the project.
      - Add your Supabase Project URL and Anon Key:
        ```
        VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The application should now be running, typically on `http://localhost:5173`.

## Usage

1.  **Sign Up / Log In:** Create an account or log in.
2.  **Dashboard:** View existing rooms or create a new one.
3.  **Jam Room:**
    - Record loops using the recorder.
    - Play back your loops or others.
    - Use the "Play All" button for synchronized playback.
    - Adjust volume/mute/loop settings.
    - Click "Export Mix" to generate and download a WAV file (play tracks once first if you encounter errors).
    - Use the share buttons to invite others.
    - Delete tracks or the entire room (if you are the host).
4.  **Profile:** Check your stats and activity.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.
