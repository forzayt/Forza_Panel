'use client';

import { CollapsibleGroup } from '@/components/tailgrids/core/collapsible';
import { Button } from '@/components/tailgrids/core/button';
import {
    Dialog,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/tailgrids/core/dialog';
import { cn } from '@/utils/cn';
import { Logo, LogoWithText, LogoWithTextDark } from '@/utils/icon';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, type DragEvent } from 'react';
import type { Key } from 'react-aria-components';
import { ThreeDots } from './icon';
import NavItem from './nav-item';
import { useNavOrder } from './use-nav-order';
import { findActiveGroupKey } from './utils';

export default function Sidebar({
    isSidebarOpen,
    onItemClick,
}: {
    isSidebarOpen: boolean;
    onItemClick?: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme } = useTheme();

    // Compute which group should be open based on the current route
    const activeGroupKey = useMemo(
        () => findActiveGroupKey(pathname),
        [pathname],
    );

    const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(
        () => new Set<Key>(activeGroupKey ? [activeGroupKey] : []),
    );

    // Drag-and-drop reordering, scoped to a single category, saved in
    // localStorage (components/common/sidebar/use-nav-order.ts).
    const { sections, moveItem } = useNavOrder();
    const [drag, setDrag] = useState<{ section: string; index: number } | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const endDrag = useCallback(() => {
        setDrag(null);
        setOverIndex(null);
    }, []);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
        } catch {
            // Even if the request fails, drop the user back on the login page.
        }
        router.replace('/login');
        router.refresh();
    }, [isLoggingOut, router]);

    const handleDragStart =
        (sectionLabel: string, index: number) => (event: DragEvent<HTMLDivElement>) => {
            setDrag({ section: sectionLabel, index });
            setOverIndex(index);
            event.dataTransfer.effectAllowed = 'move';
            // Firefox needs some data set before a drag will start.
            event.dataTransfer.setData('text/plain', String(index));
        };

    const handleDragOver =
        (sectionLabel: string, index: number) => (event: DragEvent<HTMLDivElement>) => {
            // Only allow drops inside the category the drag started in.
            if (!drag || drag.section !== sectionLabel) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            if (overIndex !== index) setOverIndex(index);
        };

    const handleDrop =
        (sectionLabel: string, index: number) => (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            if (drag && drag.section === sectionLabel) {
                moveItem(sectionLabel, drag.index, index);
            }
            endDrag();
        };

    return (
        <div className='flex h-full flex-col overflow-hidden'>
            {/* Header */}
            <div
                className={cn(
                    'flex items-center px-4 pt-7 text-text-primary',
                    isSidebarOpen
                        ? 'justify-between'
                        : 'flex-col justify-center gap-4',
                )}
            >
                <Link href='/'>
                    {isSidebarOpen ? (
                        <>
                            {theme === 'light' ? (
                                <LogoWithText />
                            ) : (
                                <LogoWithTextDark />
                            )}
                        </>
                    ) : (
                        <Logo />
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav
                className={cn(
                    'scrollbar-thin flex-1 overflow-y-auto',
                    isSidebarOpen ? 'mt-7 space-y-6 px-4' : 'mt-5 px-2',
                )}
            >
                <CollapsibleGroup
                    expandedKeys={expandedKeys}
                    onExpandedChange={setExpandedKeys}
                >
                    {sections.map((section) => (
                        <div key={section.label}>
                            {/* Expanded: show section label | Collapsed: show divider between sections */}
                            {isSidebarOpen ? (
                                <div className='mt-6 mb-4 flex items-center justify-between gap-2'>
                                    <p className='text-xs text-text-tertiary uppercase'>
                                        {section.label}
                                    </p>
                                    <span className='text-[10px] leading-3 text-text-tertiary'>
                                        drag to rearrange
                                    </span>
                                </div>
                            ) : (
                                section.label && (
                                    <span className='flex items-center justify-center pt-6 pb-4 text-icon-secondary'>
                                        <ThreeDots />
                                    </span>
                                )
                            )}

                            <div
                                className={cn(
                                    'space-y-1',
                                    !isSidebarOpen && 'space-y-1.5',
                                )}
                            >
                                {section.items.map((item, index) => {
                                    const navItem = (
                                        <NavItem
                                            id={item.title}
                                            icon={item.icon}
                                            label={item.title}
                                            href={item.url}
                                            items={item.items}
                                            collapsed={!isSidebarOpen}
                                            linkDraggable={!isSidebarOpen}
                                            onItemClick={onItemClick}
                                        />
                                    );

                                    // The collapsed rail has no room to drop onto,
                                    // so reordering only happens while expanded.
                                    if (!isSidebarOpen) {
                                        return (
                                            <div key={item.title}>{navItem}</div>
                                        );
                                    }

                                    const isDragging =
                                        drag?.section === section.label && drag.index === index;
                                    const isDropTarget =
                                        drag !== null &&
                                        drag.section === section.label &&
                                        overIndex === index &&
                                        drag.index !== index;

                                    return (
                                        <div
                                            key={item.title}
                                            draggable
                                            title='Drag to reorder'
                                            onDragStart={handleDragStart(section.label, index)}
                                            onDragOver={handleDragOver(section.label, index)}
                                            onDrop={handleDrop(section.label, index)}
                                            onDragEnd={endDrag}
                                            className={cn(
                                                'group/nav relative rounded-lg select-none',
                                                isDragging && 'opacity-40',
                                                isDropTarget &&
                                                    'ring-2 ring-orange-500/60',
                                            )}
                                        >
                                            {navItem}
                                            <span
                                                aria-hidden='true'
                                                className='pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-icon-tertiary opacity-0 transition-opacity group-hover/nav:opacity-70'
                                            >
                                                <DragHandle />
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </CollapsibleGroup>
            </nav>

            {/* Footer: Contribute + Logout */}
            <div className='space-y-2 px-4 py-4'>
                {isSidebarOpen ? (
                    <>
                        <Link
                            href='https://github.com/forzayt/Forza_Panel'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary'
                        >
                            <span className='text-icon-tertiary'>
                                <GithubIcon />
                            </span>
                            <span>Contribute</span>
                        </Link>
                        <Button
                            variant='danger'
                            appearance='fill'
                            size='sm'
                            onPress={() => setIsLogoutOpen(true)}
                            className='w-full gap-2'
                        >
                            <LogoutIcon />
                            Logout
                        </Button>
                    </>
                ) : (
                    <div className='flex flex-col items-center gap-2'>
                        <Link
                            href='https://github.com/forzayt/Forza_Panel'
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label='Contribute on GitHub'
                            className='flex items-center justify-center rounded-lg px-3 py-2.5 text-icon-tertiary transition-colors duration-200 hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-icon-primary'
                        >
                            <GithubIcon />
                        </Link>
                        <Button
                            variant='danger'
                            appearance='fill'
                            size='sm'
                            iconOnly
                            aria-label='Logout'
                            title='Logout'
                            onPress={() => setIsLogoutOpen(true)}
                        >
                            <LogoutIcon />
                        </Button>
                    </div>
                )}
            </div>

        </div>
    );
}

function DragHandle() {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            width={10}
            height={14}
            viewBox='0 0 10 14'
            fill='currentColor'
            aria-hidden='true'
        >
            <circle cx='2.5' cy='3' r='1.1' />
            <circle cx='7.5' cy='3' r='1.1' />
            <circle cx='2.5' cy='7' r='1.1' />
            <circle cx='7.5' cy='7' r='1.1' />
            <circle cx='2.5' cy='11' r='1.1' />
            <circle cx='7.5' cy='11' r='1.1' />
        </svg>
    );
}

function LogoutIcon() {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            width={18}
            height={18}
            viewBox='0 0 18 18'
            fill='none'
        >
            <path
                d='M9 2.25V8.25'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
            <path
                d='M12.375 4.95a5.25 5.25 0 1 1-6.75 0'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
        </svg>
    );
}

function GithubIcon() {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            width={18}
            height={18}
            viewBox='0 0 24 24'
            fill='currentColor'
        >
            <path d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' />
        </svg>
    );
}
