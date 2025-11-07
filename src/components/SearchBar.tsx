type SearchBarProps = {
  placeholder?: string;
  name?: string;
  defaultValue?: string;
};

export default function SearchBar({
  placeholder = "Search",
  name = "q",
  defaultValue,
}: SearchBarProps) {
  return (
    <form className="w-full max-w-xl">
      <label className="block">
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm text-zinc-700 shadow-inner outline-none transition focus:border-emerald-500"
        />
      </label>
    </form>
  );
}
