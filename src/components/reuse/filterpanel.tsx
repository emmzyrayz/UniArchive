import { useState } from "react";
import { Card, Button, Input, Checkbox, Select } from "@/components/UI";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterSection {
  id: string;
  title: string;
  type: "checkbox" | "radio" | "range" | "search";
  options: FilterOption[];
  multiple?: boolean;
}

interface FilterPanelProps {
  sections: FilterSection[];
  values: Record<string, string | string[]>;
  onChange: (filters: Record<string, string | string[]>) => void;
  onReset?: () => void;
  onApply?: () => void;
  title?: string;
  className?: string;
}

export default function FilterPanel({
  sections,
  values,
  onChange,
  onReset,
  onApply,
  title = "Filters",
  className = "",
}: FilterPanelProps) {
  const [localValues, setLocalValues] = useState(values);

  const handleCheckboxChange = (
    sectionId: string,
    optionValue: string,
    checked: boolean
  ) => {
    const currentValues = (localValues[sectionId] as string[]) || [];

    let newValues: string[];
    if (checked) {
      newValues = [...currentValues, optionValue];
    } else {
      newValues = currentValues.filter((v) => v !== optionValue);
    }

    const newFilters = { ...localValues, [sectionId]: newValues };
    setLocalValues(newFilters);
  };

  const handleRadioChange = (sectionId: string, optionValue: string) => {
    const newFilters = { ...localValues, [sectionId]: optionValue };
    setLocalValues(newFilters);
  };

  const handleSearchChange = (sectionId: string, searchValue: string) => {
    const newFilters = { ...localValues, [sectionId]: searchValue };
    setLocalValues(newFilters);
  };

  const handleApply = () => {
    onChange(localValues);
    onApply?.();
  };

  const handleReset = () => {
    const resetValues: Record<string, string | string[]> = {};
    sections.forEach((section) => {
      resetValues[section.id] = section.multiple ? [] : "";
    });

    setLocalValues(resetValues);
    onChange(resetValues);
    onReset?.();
  };

  const getSelectedCount = (sectionId: string): number => {
    const value = localValues[sectionId];
    if (Array.isArray(value)) {
      return value.length;
    }
    return value ? 1 : 0;
  };

  return (
    <Card variant="elevated" className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Button
          variant="none"
          base="off"
          onClick={handleReset}
          label="Reset All"
          className="text-sm text-indigo-600 hover:text-indigo-500"
        />
      </div>

      {/* Filter Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className="border-b border-gray-200 pb-6 last:border-b-0"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{section.title}</h4>
              {section.multiple && (
                <span className="text-xs text-gray-500">
                  {getSelectedCount(section.id)} selected
                </span>
              )}
            </div>

            {section.type === "search" ? (
              <Input
                placeholder={`Search ${section.title.toLowerCase()}...`}
                value={(localValues[section.id] as string) || ""}
                onChange={(e) => handleSearchChange(section.id, e.target.value)}
                className="w-full"
              />
            ) : section.type === "checkbox" || section.type === "radio" ? (
              <div className="space-y-2">
                {section.options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center justify-between"
                  >
                    <Checkbox
                      label={option.label}
                      checked={
                        section.type === "checkbox"
                          ? (localValues[section.id] as string[])?.includes(
                              option.value
                            ) || false
                          : localValues[section.id] === option.value
                      }
                      onChange={(e) => {
                        if (section.type === "checkbox") {
                          handleCheckboxChange(
                            section.id,
                            option.value,
                            e.target.checked
                          );
                        } else {
                          handleRadioChange(section.id, option.value);
                        }
                      }}
                      className="w-full"
                    />
                    {option.count !== undefined && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({option.count})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              section.type === "range" && (
                <div className="space-y-3">
                  <Select
                    options={section.options}
                    value={localValues[section.id] as string}
                    onChange={(e) =>
                      handleRadioChange(section.id, e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* Apply Button */}
      <Button
        variant="primary"
        label="Apply Filters"
        onClick={handleApply}
        className="w-full mt-6"
      />
    </Card>
  );
}
