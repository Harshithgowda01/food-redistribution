const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export default function Button({
  as: Comp = 'button',
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  return (
    <Comp className={`${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </Comp>
  );
}
