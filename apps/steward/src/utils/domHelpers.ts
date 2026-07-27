export const scrollToElement = (selector: string) => {
  if (!selector || selector === 'body') return;
  setTimeout(() => {
    const el = document.querySelector(selector) as HTMLElement;
    const container = document.getElementById('applet-subpage-scroll-container');
    if (el) {
      if (container && container.contains(el)) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
          
        // Always scroll to center to avoid elements getting cut off at edges
        const isFluid = !container.classList.contains('overflow-y-auto');
          
        if (isFluid) {
          const viewportHeight = window.innerHeight;
          const isFullyVisibleInViewport = (
            elRect.top >= 250 && 
            elRect.bottom <= viewportHeight - 80
          );
            
          if (!isFullyVisibleInViewport) {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            let targetScrollY = scrollY + elRect.top - (viewportHeight / 2) + (elRect.height / 2);
            if (elRect.height > viewportHeight - 100) {
              targetScrollY = scrollY + elRect.top - 200;
            }
            window.scrollTo({
              top: Math.max(0, targetScrollY),
              behavior: 'auto'
            });
          }
        } else {
          const filterWrapper = document.getElementById('metrics-dashboard-filter-wrapper');
          const stickyOffset = filterWrapper ? filterWrapper.getBoundingClientRect().height : 0;
          const visibleTopBoundary = containerRect.top + stickyOffset + 16;

          const isFullyVisibleInContainer = (
            elRect.top >= visibleTopBoundary &&
            elRect.bottom <= containerRect.bottom - 80
          );
            
          if (!isFullyVisibleInContainer) {
            const elementTopRelativeToContent = elRect.top - containerRect.top + container.scrollTop;
            let targetScrollTop = elementTopRelativeToContent - (containerRect.height / 2) + (elRect.height / 2);
              
            if (elRect.height > containerRect.height - 100) {
              targetScrollTop = elementTopRelativeToContent - 40;
            }
              
            // Prevent elements from sliding behind sticky filters/headers like #metrics-dashboard-filter-wrapper
            if (filterWrapper) {
              const maxScrollTopToKeepVisible = elementTopRelativeToContent - (stickyOffset + 16);
              if (targetScrollTop > maxScrollTopToKeepVisible) {
                targetScrollTop = maxScrollTopToKeepVisible;
              }
            }
              
            container.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'auto'
            });
          }
        }
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      } else {
        // Check if el is inside another scrollable parent, like aside
        const scrollParent = el.closest('aside') || el.closest('.overflow-y-auto');
        if (scrollParent && scrollParent !== document.body && scrollParent !== document.documentElement) {
          const parentRect = scrollParent.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
            
          const isFullyVisible = (
            elRect.top >= parentRect.top + 20 &&
            elRect.bottom <= parentRect.bottom - 20
          );
            
          if (!isFullyVisible) {
            const elementTopRelativeToContent = elRect.top - parentRect.top + scrollParent.scrollTop;
            const targetScrollTop = elementTopRelativeToContent - (parentRect.height / 3);
            scrollParent.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'auto'
            });
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
          }
        }
      }
    }
  }, 50);
};
