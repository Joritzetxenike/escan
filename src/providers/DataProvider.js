import { DataSource } from './DataSource';

import CsvProvider from './csv/csvProvider';
import ApiProvider from './api/apiProvider';

const provider =
  DataSource === 'csv'
    ? CsvProvider
    : ApiProvider;

export default provider;

