import clsx from "clsx";

interface MobileMenuButtonProps {
  expandMenu: boolean;
  setExpandMenu: (expand: boolean) => void;
}

const MobileMenuButton = ({
  expandMenu,
  setExpandMenu,
}: MobileMenuButtonProps) => {
  const handleMenuToggle = () => {
    setExpandMenu(!expandMenu);
  };

  return (
    <button
      type="button"
      aria-label="Toggle Mobile Menu"
      className="flex h-[21px] w-[26px] cursor-pointer flex-col justify-between lg:hidden"
      onClick={handleMenuToggle}
    >
      <span
        className={clsx(
          "h-[3px] w-full rounded-full bg-neutral-950 transition-all duration-300 dark:bg-neutral-100",
          expandMenu && "origin-left rotate-45",
        )}
      />
      <span
        className={clsx(
          "h-[3px] w-full rounded-full bg-neutral-950 transition-all duration-300 dark:bg-neutral-100",
          expandMenu && "w-0 opacity-0",
        )}
      />
      <span
        className={clsx(
          "h-[3px] w-full rounded-full bg-neutral-950 transition-all duration-300 dark:bg-neutral-100",
          expandMenu && "origin-left -rotate-45",
        )}
      />
    </button>
  );
};

export default MobileMenuButton;
