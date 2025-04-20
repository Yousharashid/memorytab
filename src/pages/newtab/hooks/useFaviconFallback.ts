import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFaviconUrl } from '../utils';

/**
 * Custom hook to manage favicon fetching with a layered fallback strategy.
 * 
 * @param domainOrUrl The domain or full URL to fetch the favicon for.
 * @returns An object containing the current `iconSrc` to use and the `handleError` callback for the img tag.
 */
export function useFaviconFallback(domainOrUrl?: string) {
    // --- State --- 
    const [iconSrc, setIconSrc] = useState<string>('');
    const [attempt, setAttempt] = useState<number>(0);

    // --- Memoized calculation of domain and initial source --- 
    const { domain, initialSrc } = useMemo(() => {
        let calculatedDomain = '';
        try {
            if (domainOrUrl && domainOrUrl.includes('://')) {
                calculatedDomain = new URL(domainOrUrl).hostname.replace(/^www\./, '');
            } else if (domainOrUrl) {
                calculatedDomain = domainOrUrl; // Assume it's already a domain
            }
        } catch (e) {
             console.warn('useFaviconFallback: Failed to parse domain from', domainOrUrl);
        }
        const calculatedInitialSrc = getFaviconUrl(calculatedDomain || domainOrUrl); 
        return { domain: calculatedDomain, initialSrc: calculatedInitialSrc };
    }, [domainOrUrl]);

    // --- Effect to reset src and attempts when the input URL changes --- 
    useEffect(() => {
        setIconSrc(initialSrc);
        setAttempt(0);
    }, [initialSrc]); // Dependency includes the calculated initial source

    // --- Error Handling Callback --- 
    const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        img.onerror = null; // Prevent loops on immediate failure of next source

        const nextAttempt = attempt + 1;
        setAttempt(nextAttempt);

        console.debug(`useFaviconFallback: Error on attempt ${attempt} for ${domain || domainOrUrl}, next is ${nextAttempt}`);

        if (nextAttempt === 1 && domain) {
            // Attempt 1: Try favicone.com
            console.debug(`Favicon fallback (hook): Trying favicone.com for ${domain}`);
            setIconSrc(`https://favicone.com/${domain}?s=32`);
        } else if (nextAttempt === 2) {
            // Attempt 2: Use local SVG
            console.debug(`Favicon fallback (hook): Using local globe icon for ${domain || domainOrUrl}`);
            setIconSrc(chrome.runtime.getURL('globe-icon.svg'));
        } else if (nextAttempt > 2) {
            // All attempts failed
            console.error(`Favicon failed multiple times (hook) for: ${domain || domainOrUrl}`);
            // Keep the last attempted src (likely the globe)
        }
    }, [attempt, domain, domainOrUrl]); // Include attempt in dependencies

    // Return the current source and the error handler
    return { iconSrc, handleError };
} 