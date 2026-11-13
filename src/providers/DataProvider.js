import { DataSource } from './DataSource';

import CsvProvider from './csv/csvProvider';
import SupabaseProvider from './supabase/SupabaseProvider';

const provider =
  DataSource === 'csv'
    ? CsvProvider
    : SupabaseProvider;

export default provider;

