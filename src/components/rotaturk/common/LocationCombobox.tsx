'use client';

import * as React from 'react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import locations from '@/lib/data/turkey-locations.json';
import { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LocationComboboxProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  labelClassName?: string;
}

const cities = locations.map((loc) => ({ value: loc.name, label: loc.name }));

const normalizeSearchText = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function LocationCombobox({ form, name, label, labelClassName }: LocationComboboxProps) {
  const t = useTranslations('LocationCombobox');
  const [cityPickerOpen, setCityPickerOpen] = React.useState(false);
  const [citySearch, setCitySearch] = React.useState('');
  const selectedCity = form.watch(`${name}.city`);
  const filteredCities = cities.filter((city) =>
    normalizeSearchText(city.label).includes(normalizeSearchText(citySearch.trim()))
  );
  const districts =
    locations
      .find((loc) => loc.name === selectedCity)
      ?.districts.map((d) => ({ value: d, label: d })) || [];

  return (
    <FormItem className='space-y-3'>
      <FormLabel className={cn("font-semibold", labelClassName)}>{label}</FormLabel>
      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name={`${name}.city`}
          render={({ field }) => (
            <FormItem>
              <Popover
                open={cityPickerOpen}
                onOpenChange={(open) => {
                  setCityPickerOpen(open);
                  if (!open) setCitySearch('');
                }}
              >
                <FormControl>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityPickerOpen}
                      className="h-10 w-full justify-between rounded-md border border-input bg-white px-3 py-2 text-left font-normal text-black shadow-none hover:bg-white hover:text-black"
                    >
                      <span className="truncate">
                        {field.value || t('cityPlaceholder')}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                </FormControl>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                  <div className="p-2">
                    <Input
                      autoFocus
                      placeholder={t('citySearchPlaceholder')}
                      value={citySearch}
                      onChange={(event) => setCitySearch(event.target.value)}
                    />
                    <div role="listbox" className="mt-1 max-h-60 overflow-y-auto">
                      {filteredCities.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          {t('noCitiesFound')}
                        </p>
                      ) : (
                        filteredCities.map((city) => (
                          <button
                            type="button"
                            role="option"
                            aria-selected={field.value === city.value}
                            key={city.value}
                            className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            onClick={() => {
                              field.onChange(city.value);
                              form.setValue(`${name}.district`, '');
                              form.trigger(`${name}.city`);
                              setCityPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === city.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {city.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${name}.district`}
          render={({ field }) => (
            <FormItem>
              <Select
                 onValueChange={(value) => {
                    field.onChange(value === 'all' ? '' : value);
                 }}
                 value={field.value} // Directly use field value
                 disabled={!selectedCity}
              >
                <FormControl>
                  <SelectTrigger className="bg-accent text-accent-foreground">
                    <SelectValue placeholder={t('districtPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">{t('allDistricts')}</SelectItem>
                  {districts.map((district) => (
                    <SelectItem key={district.value} value={district.value}>
                      {district.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormItem>
  );
}
