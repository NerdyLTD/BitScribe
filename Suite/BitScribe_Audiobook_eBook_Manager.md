# BitScribe Codex: Dedicated Audiobook & eBook Manager
## Architectural Specification & Design Document

### 1. Vision & Core Philosophy
Existing self-hosted digital library solutions like *Audiobookshelf* or *Kavita* often suffer from overcomplicated, fragmented user interfaces, patchy or slow metadata matching, and aggressive separation of media types (treating an eBook and its Audiobook counterpart as completely detached files). 

**BitScribe Codex** is a highly focused, visual-first management system designed to treat books as a single, multi-format unit. Whether you possess an `.epub`, `.pdf`, `.m4b`, or folder of `.mp3` files for a given title, they are aggregated under a single aesthetic "Edition Card."

- **The Single-View Ledger**: All libraries, statistics, and folder configurations live in a highly unified, single-screen structural cockpit that prioritizes generous negative space, premium typography, and instant status filtering.
- **Physical-First Integrity**: Mirroring the design logic of *BitScribe RX*, Codex respects physical folder layout structures, cleaning dirty filenames and automatically injecting clean metadata back into standard EPUB container tags and M4B/MP3 ID3 metadata.

---

### 2. Aesthetic & Visual Identity (The "Bookkeeper" Theme)
Codex employs an editorial, warm-dark visual aesthetic styled after classic book-binding and letterpress workshops:

- **Typography Palette**:
  - *Primary Headings*: Elegantly spaced serif display typography (e.g., **Playfair Display** or **Lora**) with wide tracking.
  - *Body Text*: High-legibility sans-serif (**Inter**) for general controls and summaries.
  - *Metadata & Stats*: High-contrast monospace (**JetBrains Mono**) for file details, bitrates, and file size counters.
- **Color Scheme**:
  - *Canvas (Background)*: Deep charcoal-sepia cream (`#121110`).
  - *Cards / Containers*: Soft warm paper-black (`#1C1A18`) with ultra-subtle border strokes.
  - *Accent Elements*: Soft antique brass/amber (`#D4AF37`) and clean parchment off-white (`#F4EFEA`).
- **Interaction Model**: Custom page-turn slide transitions and organic hover expansion effects built with `motion/react`.

---

### 3. Core Features & Capabilities

#### A. Unified Edition Cards (Multi-Format Grouping)
- Avoids separating Audiobooks and eBooks into separate screens.
- **Dynamic Format Badges**: Displays clean, rounded icons indicating available formats (e.g., `EPUB`, `PDF`, `M4B`, `MP3 Chaptered`) on a single cover card.
- **Integrated Playback & Reading**: Tap a card to instantly slide open an immersive reading/listening panel without steering the user away from their current dashboard.

#### B. High-Precision Metadata Engine (The Codex Resolver)
- **Multi-Source Fetching**: Orchestrates asynchronous requests to OpenLibrary, Google Books, Goodreads, and Audible APIs.
- **Automated Fallback Hierarchy**:
  1. *EPUB Internal Manifest Parsing*: Reads internal tags first.
  2. *Audible/Goodreads Scraping*: Falls back to fuzzy-matching parsed file names.
  3. *Manual Curated Selection*: When results are uncertain, shows a visually beautiful side-by-side matching dialog instead of a blank or misattributed page.
- **Narrator & Author Distinctions**: First-class support for narrators, keeping series, authors, and reading voices searchable as separate relational categories.

#### C. Physical Remediation & Re-Tagging (BitScribe RX Integration)
- **Filenaming Standardization**: Safely strips typical torrent/release group suffixes (using the curated `/Suite/Release_Groups.txt` list) and formats files consistently:
  - *eBooks*: `[Author] - [Series Vol #] - [Book Title] [Year].epub`
  - *Audiobooks*: `[Author]/[Book Title] ([Narrator]) [Year]/[Disc/Track] - [Chapter Title].m4b`
- **Metadata Back-Injections**: Writes fetched metadata back to file tags using server-side toolkits (e.g., `exiftool` or custom Node modules), ensuring files remain fully organized if moved outside the Codex system.

---

### 4. Database Schema Proposal
A lightweight, lightning-fast database model designed to run perfectly with Cloud SQL (PostgreSQL) or SQLite:

```sql
-- Books Table (Primary metadata entity)
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    series_name VARCHAR(255),
    series_index NUMERIC(4, 1),
    description TEXT,
    published_year INTEGER,
    publisher VARCHAR(255),
    isbn_10 VARCHAR(10),
    isbn_13 VARCHAR(13),
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contributors Table (Separating Authors and Narrators cleanly)
CREATE TABLE contributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'author' or 'narrator'
    biography TEXT,
    avatar_url TEXT
);

-- Book Contributors Join Table
CREATE TABLE book_contributors (
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    contributor_id UUID REFERENCES contributors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, contributor_id)
);

-- Media Files Table (Enables multi-format files mapped to one book)
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL UNIQUE,
    file_format VARCHAR(50) NOT NULL, -- 'epub', 'pdf', 'm4b', 'mp3_folder'
    file_size BIGINT NOT NULL,
    duration_seconds INTEGER, -- Null for eBooks
    bitrate INTEGER, -- Null for eBooks
    is_remediated BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5. Implementation Roadmap
1. **Phase 1: Scanner & Parser**: Port the unified prefix-stripping and group-cleaning algorithms from BitScribe Steward to parse book titles and author strings.
2. **Phase 2: Metadata Fetcher & Matcher**: Set up server-side proxy routes to query OpenLibrary and Google Books securely.
3. **Phase 3: The Editorial Dashboard**: Build the React front-end utilizing a responsive, single-page bento-grid layout prioritizing typography over margin clutter.
4. **Phase 4: Remediation Engine**: Implement file re-tagging and structure reorganization to match standard naming schemas.
