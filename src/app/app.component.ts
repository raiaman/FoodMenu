import { Component, OnInit, Renderer2 } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('rippleEffect', [
      transition(':enter', [
        style({ transform: 'scale(0)', opacity: 0.5 }),
        animate('300ms ease-out', style({ transform: 'scale(4)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class AppComponent implements OnInit {
  public currentCount = 0;
  myForm: FormGroup;
  menulist: MenuDetails[] = [];
  menulistData: MenuDetails[] = [];
  formValues: any;
  displayStyle: string = 'none';
  tables: number[] = [1, 2, 3, 4, 5, 6];
  orderItems: any[] = [];
  selectedTable: any;
  searchTerm = new FormControl('');
  isLoading: boolean = true;

  ngOnInit() {
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
  }

  constructor(private renderer: Renderer2, private formBuilder: FormBuilder, private http: HttpClient, private _snackBar: MatSnackBar) {
    this.renderer.setStyle(document.body, 'background-color', '#222223');
    this.renderer.setStyle(document.body, 'color', '#FFFFFF');
    this.myForm = this.formBuilder.group({
      cartTotalGroup: this.formBuilder.group({
        cartTotalNo: new FormControl()
      }),
      table: ['', Validators.required],
      menulist: this.formBuilder.array([]),
      menulistData: this.formBuilder.array([])
    });

    http.get<MenuDetails[]>('./assets/chinese.json').subscribe(
      result => {
        this.menulist = result;
        this.menulistData = result;
        this.populateForm();
      },
      error => {
        console.error(error);
      }
    );
  }

  populateForm() {
    const menulistFormArray = this.myForm.get('menulist') as FormArray;
    menulistFormArray.clear();
    this.menulist = this.menulistData;
    if (this.menulist != null) {
      this.menulist.forEach(menu => {
        const menuFormGroup = this.formBuilder.group({
          header: menu.header,
          items: this.formBuilder.array([])
        });
        const itemsFormArray = menuFormGroup.get('items') as FormArray;
        menu.items.forEach(item => {
          const itemFormGroup = this.formBuilder.group({
            imgsrc: item.imgsrc,
            name: item.name,
            price1: item.price1,
            price2: item.price2,
            count1: item.count1,
            count2: item.count2
          });
          itemsFormArray.push(itemFormGroup);
        });
        menulistFormArray.push(menuFormGroup);
      });
    }
  }

  onTableSelectionChange(event: any) {
    this.selectedTable = event.target.value;
  }

  openSnackBar(message: string, type: string) {
    this._snackBar.open(message, 'Close', {
      duration: 3000
    });
  }

  closePopup() {
    this.displayStyle = "none";
    this.formValues = null;
    this.myForm.controls['table'].setValue('');
  }

  addToCart() {
    this.formValues = this.myForm.value;
    this.displayStyle = 'none';
    this.generateOrderItems();
    if (this.orderItems.length > 0) {
      this.displayStyle = 'block';
    } else {
      this.openSnackBar('Please select items to add to the cart!', 'X');
    }
  }

  placeOrder() {
    this.displayStyle = "none";
    this.formValues = null;
    this.myForm.controls['table'].setValue('');
    const dataToSend = {
      selectedTable: this.selectedTable,
      userName: 'Grill_N_Shakes',
      orderItems: this.orderItems
    };
    const jwtToken = 'your_jwt_token_here';
    if (jwtToken) {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        })
      };

      this.http.post('https://localhost:7104/api/Order/Post', dataToSend, httpOptions).subscribe(
        response => {
          this.openSnackBar('Order placed successfully!', 'X');
          const menulistFormArray = this.myForm.get('menulist') as FormArray;
          menulistFormArray.clear();
          this.menulist = this.menulistData;
        },
        error => {
          this.openSnackBar('Order Failed. Please contact Hotel Staff!', 'X');
        }
      );
    } else {
      this.openSnackBar('Token Expired! Please contact Admin.', 'X');
    }
  }

  filterMenuItems() {
    const filteredMenu: MenuDetails[] = [];
    const searchTermValue = this.searchTerm?.value?.toLowerCase();
    if (searchTermValue) {
      this.menulistData.forEach(menu => {
        const filteredItems: MenuItem[] = menu.items.filter(item => {
          const itemName = item.name.toLowerCase();
          return itemName.includes(searchTermValue);
        });

        if (filteredItems.length > 0) {
          filteredMenu.push({
            header: menu.header,
            items: filteredItems
          });
        }
      });

      // Clear the existing items in the FormArray
      const menulistFormArray = this.myForm.get('menulist') as FormArray;
      menulistFormArray.clear();

      // Add the filtered items to the FormArray
      filteredMenu.forEach(menu => {
        const menuFormGroup = this.formBuilder.group({
          header: menu.header,
          items: this.formBuilder.array([])
        });

        const itemsFormArray = menuFormGroup.get('items') as FormArray;
        menu.items.forEach(item => {
          const itemFormGroup = this.formBuilder.group({
            imgsrc: item.imgsrc,
            name: item.name,
            price1: item.price1,
            price2: item.price2,
            count1: item.count1,
            count2: item.count2
          });

          itemsFormArray.push(itemFormGroup);
        });
        menulistFormArray.push(menuFormGroup);
      });
      this.menulist = filteredMenu;
    } else {
      const menulistFormArray = this.myForm.get('menulist') as FormArray;
      menulistFormArray.clear();
      this.populateForm();
    }
  }

  public incrementCounter1(menuIndex: number, itemIndex: number) {
    const menuFormArray = this.myForm.get('menulist') as FormArray;
    const menuFormGroup = menuFormArray.at(menuIndex) as FormGroup;
    const itemsFormArray = menuFormGroup.get('items') as FormArray;
    const itemFormGroup = itemsFormArray.at(itemIndex) as FormGroup;
    const count1Control = itemFormGroup.get('count1') as FormControl;
    if (count1Control.value < 9) {
      count1Control.setValue(count1Control.value + 1);
    }
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  public incrementCounter2(menuIndex: number, itemIndex: number) {
    const menuFormArray = this.myForm.get('menulist') as FormArray;
    const menuFormGroup = menuFormArray.at(menuIndex) as FormGroup;
    const itemsFormArray = menuFormGroup.get('items') as FormArray;
    const itemFormGroup = itemsFormArray.at(itemIndex) as FormGroup;
    const count2Control = itemFormGroup.get('count2') as FormControl;
    if (count2Control.value < 9) {
      count2Control.setValue(count2Control.value + 1);
    }
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  public decrementCounter1(menuIndex: number, itemIndex: number) {
    const menuFormArray = this.myForm.get('menulist') as FormArray;
    const menuFormGroup = menuFormArray.at(menuIndex) as FormGroup;
    const itemsFormArray = menuFormGroup.get('items') as FormArray;
    const itemFormGroup = itemsFormArray.at(itemIndex) as FormGroup;
    const count1Control = itemFormGroup.get('count1') as FormControl;
    if (count1Control.value > 0) {
      count1Control.setValue(count1Control.value - 1);
    }
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  public decrementCounter2(menuIndex: number, itemIndex: number) {
    const menuFormArray = this.myForm.get('menulist') as FormArray;
    const menuFormGroup = menuFormArray.at(menuIndex) as FormGroup;
    const itemsFormArray = menuFormGroup.get('items') as FormArray;
    const itemFormGroup = itemsFormArray.at(itemIndex) as FormGroup;
    const count2Control = itemFormGroup.get('count2') as FormControl;
    if (count2Control.value > 0) {
      count2Control.setValue(count2Control.value - 1);
    }
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  generateOrderItems() {
    this.orderItems = [];
    for (const section of this.formValues.menulist) {
      for (const item of section.items) {
        if (item.count1 > 0 || item.count2 > 0) {
          this.orderItems.push({
            name: item.name,
            size1: item.count1,
            size2: item.count2
          });
        }
      }
    }
    var itemCount = 0;
      this.orderItems.forEach(item => {
        itemCount += item.size1 + item.size2;
      });
      const cartTotalNoControl = this.myForm.get('cartTotalGroup.cartTotalNo');
      if (cartTotalNoControl) {
        cartTotalNoControl.setValue(itemCount);
      } else {
        this.myForm.get('cartTotalGroup.cartTotalNo')?.setValue(itemCount);
      }
  }
}

interface MenuItem {
  imgsrc: string;
  name: string;
  price1: string;
  price2: string;
  count1: number;
  count2: number;
}

interface MenuDetails {
  header: string;
  items: MenuItem[];
}