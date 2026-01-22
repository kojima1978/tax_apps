'use client';

import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface Application {
    id: string;
    title: string;
    description: string;
    url: string;
    icon: string;
    createdAt: Date;
    updatedAt: Date;
}

interface AdminAppSortProps {
    applications: Application[];
}

function SortableItem({ app }: { app: Application }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: app.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? 'relative' as const : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white p-4 rounded-lg border flex items-center gap-4 ${isDragging ? 'shadow-lg border-green-500 bg-green-50' : 'border-gray-200 shadow-sm'
                }`}
        >
            <div {...attributes} {...listeners} className="cursor-grab touch-none text-gray-400 hover:text-gray-600">
                <GripVertical size={20} />
            </div>
            <div>
                <h3 className="font-medium text-gray-900">{app.title}</h3>
                <p className="text-sm text-gray-500">{app.description}</p>
            </div>
        </div>
    );
}

export default function AdminAppSort({ applications }: AdminAppSortProps) {
    const [orderedApps, setOrderedApps] = useState<Application[]>(applications);
    const [mounted, setMounted] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        setMounted(true);
        // Load order from localStorage
        const savedOrder = localStorage.getItem('portal_app_order');
        if (savedOrder) {
            try {
                const orderIds = JSON.parse(savedOrder) as string[];
                const newOrder = [...applications].sort((a, b) => {
                    const indexA = orderIds.indexOf(a.id);
                    const indexB = orderIds.indexOf(b.id);
                    // If both IDs are in the saved list, sort by index
                    if (indexA !== -1 && indexB !== -1) {
                        return indexA - indexB;
                    }
                    // If only A is in list, it comes first
                    if (indexA !== -1) return -1;
                    // If only B is in list, it comes first
                    if (indexB !== -1) return 1;
                    // If neither, keep original order (or put at end)
                    return 0;
                });
                setOrderedApps(newOrder);
            } catch (e) {
                console.error('Failed to parse saved order', e);
                setOrderedApps(applications);
            }
        } else {
            setOrderedApps(applications);
        }
    }, [applications]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setOrderedApps((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Save to localStorage
                const orderIds = newOrder.map(app => app.id);
                localStorage.setItem('portal_app_order', JSON.stringify(orderIds));

                return newOrder;
            });
        }
    };

    if (!mounted) {
        return (
            <div className="space-y-4">
                {orderedApps.map((app) => (
                    <div key={app.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className="text-gray-400">
                            <GripVertical size={20} />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{app.title}</h3>
                            <p className="text-sm text-gray-500">{app.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={orderedApps.map(app => app.id)}
                strategy={rectSortingStrategy}
            >
                <div className="space-y-4">
                    {orderedApps.map((app) => (
                        <SortableItem key={app.id} app={app} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
