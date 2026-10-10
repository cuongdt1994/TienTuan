import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>;
}

export function MenuIcon(props: IconProps) { return <Icon {...props}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>; }
export function CloseIcon(props: IconProps) { return <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>; }
export function MailIcon(props: IconProps) { return <Icon {...props}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="m3 7 9 6 9-6" /></Icon>; }
export function PhoneIcon(props: IconProps) { return <Icon {...props}><path d="M6.6 3.5 9 3l2 4.5-2.2 1.7a14.5 14.5 0 0 0 6 6l1.7-2.2 4.5 2-.5 2.4a2 2 0 0 1-2.2 1.5A16.5 16.5 0 0 1 4.8 5.7a2 2 0 0 1 1.8-2.2Z" /></Icon>; }
export function MessageCircleIcon(props: IconProps) { return <Icon {...props}><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.4-.7L4 20l1.7-3.7A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" /></Icon>; }
export function ChevronLeftIcon(props: IconProps) { return <Icon {...props}><path d="m14.5 5-7 7 7 7" /></Icon>; }
export function ChevronRightIcon(props: IconProps) { return <Icon {...props}><path d="m9.5 5 7 7-7 7" /></Icon>; }
export function ArrowUpIcon(props: IconProps) { return <Icon {...props}><path d="M12 19V5M6 11l6-6 6 6" /></Icon>; }
