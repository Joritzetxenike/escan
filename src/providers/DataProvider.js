import { DataSource } from './DataSource';

import CsvProvider from './csv/csvProvider';
import ApiProvider from './api/apiProvider';
import SupabaseProvider from './supabase/SupabaseProvider';

const provider =
  DataSource === 'csv'
    ? CsvProvider
    : SupabaseProvider;

export default provider;

