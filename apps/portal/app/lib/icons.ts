/**
 * Icon Registry
 * ポータルで使用可能なアイコンの一覧と動的取得
 *
 * lucide-react の `import *` を避け、必要なアイコンのみバンドルする
 */

import type { LucideIcon } from 'lucide-react';
import {
  // 税務アプリで使用中
  Activity, Briefcase, Building, Calculator, ClipboardList,
  FileCheck, FileText, Gift, Home, TrendingUp,
  // 追加アイコン
  Archive, Award, BarChart3, Bell, BookOpen,
  Calendar, Camera, CheckSquare, Code, Coffee,
  Compass, CreditCard, Database, Film, FolderOpen,
  Globe, Heart, Image, Inbox, Key,
  Laptop, Layout, Mail, Map, Megaphone,
  MessageCircle, Monitor, Package, Palette, PenTool,
  Phone, PieChart, Printer, Radio, Search,
  Server, Settings, Share2, Shield, ShoppingCart,
  Smartphone, Star, Tag, Target, Terminal,
  Truck, Tv, Umbrella, Users, Video,
  Wifi, Wrench, Zap,
} from 'lucide-react';

/** アイコン名 → コンポーネント のマッピング */
export const iconMap: Record<string, LucideIcon> = {
  Activity, Briefcase, Building, Calculator, ClipboardList,
  FileCheck, FileText, Gift, Home, TrendingUp,
  Archive, Award, BarChart3, Bell, BookOpen,
  Calendar, Camera, CheckSquare, Code, Coffee,
  Compass, CreditCard, Database, Film, FolderOpen,
  Globe, Heart, Image, Inbox, Key,
  Laptop, Layout, Mail, Map, Megaphone,
  MessageCircle, Monitor, Package, Palette, PenTool,
  Phone, PieChart, Printer, Radio, Search,
  Server, Settings, Share2, Shield, ShoppingCart,
  Smartphone, Star, Tag, Target, Terminal,
  Truck, Tv, Umbrella, Users, Video,
  Wifi, Wrench, Zap,
};

/** 利用可能なアイコン名の一覧（select 用） */
export const AVAILABLE_ICONS = Object.keys(iconMap);
