const fs = require('fs');
const content = fs.readFileSync('packages/ui-components/src/BitsyCharacter.tsx', 'utf8');

const target = `          setEyeOffset({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
          });
        } else {
          setEyeOffset({ x: 0, y: 0 });
        }
      } else {
        setEyeOffset({ x: 0, y: 0 });
      }

      animationFrameId = requestAnimationFrame(updateEyePosition);
    };

    updateEyePosition();`;

const replacement = `          setEyeOffset(prev => {
            const newX = Math.cos(angle) * distance;
            const newY = Math.sin(angle) * distance;
            if (Math.abs(prev.x - newX) > 0.01 || Math.abs(prev.y - newY) > 0.01) {
              return { x: newX, y: newY };
            }
            return prev;
          });
        } else {
          setEyeOffset(prev => (prev.x === 0 && prev.y === 0) ? prev : { x: 0, y: 0 });
        }
      } else {
        setEyeOffset(prev => (prev.x === 0 && prev.y === 0) ? prev : { x: 0, y: 0 });
      }

      if (targetSelector) {
        animationFrameId = requestAnimationFrame(updateEyePosition);
      }
    };

    if (targetSelector) {
      updateEyePosition();
    } else {
      setEyeOffset({ x: 0, y: 0 });
    }
`;

if (content.includes(target)) {
  fs.writeFileSync('packages/ui-components/src/BitsyCharacter.tsx', content.replace(target, replacement));
  console.log("Patched BitsyCharacter");
} else {
  console.log("Target not found!");
}
