# Third-Party Dependency Licenses

This folder contains disclosures and terms for the open-source software libraries and binaries used in **BitScribe Steward**.

---

## License Summary Table

| Dependency | License Type | Usage in BitScribe |
| :--- | :--- | :--- |
| **Electron** | MIT | Desktop window framework |
| **Electron Builder** | MIT | Portable packaging utility |
| **Express** | MIT | Local background API and file hosting server |
| **SQLite3** | BSD-3-Clause | Native lightweight SQL storage database |
| **Fluent-FFmpeg** | MIT | Wrapper for media info parsing utilities |
| **FFprobe-Static** | GPL-3.0 | Pre-compiled static binary downloader |
| **React & React DOM** | MIT | UI view construction framework |
| **Recharts** | MIT | Auditing statistics and dashboard visualizers |
| **ExcelJS & SheetJS** | MIT / Apache-2.0 | Excel auditing & rule template exportation |
| **Google GenAI SDK** | Apache-2.0 | Google Gemini AI assistant capabilities |
| **Dotenv** | BSD-2-Clause | Local workspace parameter variables config |

---

## Full License Texts

### 1. MIT License (React, Express, Electron, Fluent-FFmpeg, ExcelJS, Recharts)
```text
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 2. BSD 3-Clause License (SQLite3)
```text
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### 3. GNU General Public License v3.0 (FFprobe-Static Binaries)
The static binaries packaged with the app via the `ffprobe-static` module are licensed under the GNU General Public License v3.0.

Because we distribute `ffprobe-static` as a standalone binary tool wrapped by our standard MIT/Apache code (using standard IPC subprocess spawning via `fluent-ffmpeg` / `child_process`), this is considered a **"mere aggregation"** under Section 5 of the GPL-3.0. The surrounding proprietary or Apache-licensed code does not inherit the GPL requirements because it is not a derivative work of ffprobe.

The full GPL-3.0 text is available in `Licenses/GPL_LICENSE.txt` inside this folder.
You can request the source code of the underlying FFmpeg tools from FFmpeg's official repository (https://ffmpeg.org/download.html).
