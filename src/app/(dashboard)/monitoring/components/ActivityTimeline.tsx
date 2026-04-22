'use client';

import { Activity, ShoppingCart, Wallet, LogIn, LogOut, Map as MapIcon, Package, Store, PlusCircle, Home, MapPin, Clock, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatWaktu } from '@/lib/utils';
import { ActivityItem, DynamicActivityData } from '../types';

interface ActivityTimelineProps {
    combinedActivities: ActivityItem[];
    sessionLimit: number;
    setSessionLimit: (updater: (prev: number) => number) => void;
}

export function ActivityTimeline({ 
    combinedActivities, 
    sessionLimit, 
    setSessionLimit 
}: ActivityTimelineProps) {
    if (combinedActivities.length === 0) {
        return (
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2 mt-6">
                    <Activity className="w-4 h-4" /> Aktivitas
                </h3>
                <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    Pilih user dan tanggal untuk melihat linimasa
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2 mt-6">
                <Activity className="w-4 h-4" /> Aktivitas
            </h3>

            <Card className="border shadow-sm p-4">
                <div className="relative space-y-0 pl-1 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted-foreground/20">
                    {combinedActivities.slice(0, sessionLimit).map((activity) => {
                        let Icon = Activity;
                        let colorClass = 'bg-primary';

                        if (activity.type === 'sales') { Icon = ShoppingCart; colorClass = 'bg-red-500'; }
                        if (activity.type === 'deposit') { Icon = Wallet; colorClass = 'bg-green-600'; }
                        if (activity.type === 'checkin') { Icon = LogIn; colorClass = 'bg-success'; }
                        if (activity.type === 'checkout') { Icon = LogOut; colorClass = 'bg-orange-500'; }
                        if (activity.type === 'stay') { Icon = MapIcon; colorClass = activity.color ? '' : 'bg-blue-500'; }
                        if (activity.type === 'noo') { Icon = PlusCircle; colorClass = 'bg-purple-600'; }
                        if (activity.type === 'receive') { Icon = Package; colorClass = 'bg-yellow-600'; }
                        if (activity.type === 'visit') {
                            Icon = Store;
                            colorClass = 'bg-cyan-600';
                            if ((activity.data as DynamicActivityData)?.isHome) {
                                Icon = Home;
                                colorClass = 'bg-blue-600';
                            } else if (activity.title.startsWith('Basecamp')) {
                                Icon = MapPin;
                                colorClass = 'bg-indigo-600';
                            }
                        }

                        return (
                            <div key={activity.id} className="relative pl-8 pb-8 last:pb-2">
                                {/* Timeline dot */}
                                <div
                                    className={`absolute left-[5px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background z-10 shadow-sm flex items-center justify-center ${colorClass}`}
                                    style={activity.color ? { backgroundColor: activity.color } : {}}
                                >
                                    <Icon className="w-2 h-2 text-white" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{activity.userName}</p>
                                            <p className="text-sm font-bold tracking-tight">{activity.title}</p>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-mono font-medium shrink-0">
                                            {formatWaktu(activity.timestamp)}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 leading-tight">
                                            {activity.type === 'stay' ? (
                                                <>
                                                    <Clock className="w-3 h-3 shrink-0" />
                                                    {activity.duration && activity.duration > 0 ? `Menetap selama ${activity.duration} menit` : 'Singgah sebentar'}
                                                </>
                                            ) : (
                                                activity.description
                                            )}
                                        </p>

                                        {(activity.lat && activity.lng) && (
                                            <div className="flex items-center gap-3 mt-1">
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${activity.lat},${activity.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 hover:underline transition-colors"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    Lihat Lokasi
                                                </a>

                                                <span className="text-[9px] text-muted-foreground italic bg-muted px-1.5 py-0.5 rounded">
                                                    {activity.lat.toFixed(4)}, {activity.lng.toFixed(4)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {combinedActivities.length > sessionLimit && (
                        <Button
                            variant="ghost"
                            className="w-full mt-4 border-dashed text-muted-foreground"
                            onClick={() => setSessionLimit(prev => prev + 10)}
                        >
                            Lihat Lainnya
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
