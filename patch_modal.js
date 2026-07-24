const fs = require('fs');
const content = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');

const target = `          </main>
      </div>
    </div>
    </>
  );
}`;

const replacement = `            {isAppResetting && (
              <AppResetModal onComplete={() => {
                localStorage.clear();
                clearDb().then(() => {
                  window.location.reload();
                }).catch(() => {
                  window.location.reload();
                });
              }} />
            )}
          </main>
      </div>
    </div>
    </>
  );
}`;

if (content.includes(target)) {
  fs.writeFileSync('apps/steward/src/App.tsx', content.replace(target, replacement));
  console.log("Patched AppResetModal");
} else {
  console.log("Could not find target block");
}
