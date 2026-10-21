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
import locations from '@/lib/data/turkey-locations.json';
import { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface LocationComboboxProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  labelClassName?: string;
}

const cities = locations.map((loc) => ({ value: loc.name, label: loc.name }));

export function LocationCombobox({ form, name, label, labelClassName }: LocationComboboxProps) {
  const t = useTranslations('LocationCombobox');
  const selectedCity = form.watch(`${name}.city`);
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
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue(`${name}.district`, ''); // Reset district when city changes
                  form.trigger(`${name}.city`); // Trigger validation to re-render dependent fields
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="bg-white text-black">
                    <SelectValue placeholder={t('cityPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.value} value={city.value}>
                      {city.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
