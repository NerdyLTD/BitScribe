const fs = require('fs');
let file = fs.readFileSync('apps/steward/src/components/RuleEditor.tsx', 'utf8');

// Add diagnostic logging to RuleCriteria interface? No, it's a global option, but the user is using `rules` object for other global options!
// Let's check if there's an existing property for it or if we should add one.
