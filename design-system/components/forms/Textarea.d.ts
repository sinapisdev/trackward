import type * as React from "react";

/** Multi-line field — checkpoint pass criteria, task descriptions. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { rows?: number }
export declare function Textarea(props: TextareaProps): React.JSX.Element;
